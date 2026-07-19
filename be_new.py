from __future__ import annotations

# -------------------
# Imports
# -------------------
import os
import tempfile
from typing import Annotated, Any, Dict, Optional, TypedDict

import asyncio
import aiosqlite


from langgraph.graph import StateGraph, START
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition

from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver


from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage
from langchain_core.tools import tool, BaseTool

from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS

from langchain_mcp_adapters.client import MultiServerMCPClient

from pydantic import BaseModel

from langchain_core.documents import Document

from langchain_core.prompts import ChatPromptTemplate

# -------------------
# 1. LLM + embeddings
# -------------------
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key="AIzaSyA_SvS5dIijAa-uIbzd4WsCqFzctedicso",
)

embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    google_api_key="AIzaSyA_SvS5dIijAa-uIbzd4WsCqFzctedicso",
)

UPPER_TH = 0.7
LOWER_TH = 0.3

# -------------------
# 2. Thread storage
# -------------------
_THREAD_RETRIEVERS: Dict[str, Any] = {}
_THREAD_METADATA: Dict[str, dict] = {}


def _get_retriever(thread_id: Optional[str]):
    if thread_id and thread_id in _THREAD_RETRIEVERS:
        return _THREAD_RETRIEVERS[thread_id]
    return None


# -------------------
# 3. PDF ingestion
# -------------------
def ingest_pdf(
    file_bytes: bytes, thread_id: str, filename: Optional[str] = None
) -> dict:
    if not file_bytes:
        raise ValueError("No file provided")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as f:
        f.write(file_bytes)
        temp_path = f.name

    try:
        loader = PyPDFLoader(temp_path)
        docs = loader.load()

        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = splitter.split_documents(docs)

        vector_store = FAISS.from_documents(chunks, embeddings)
        retriever = vector_store.as_retriever(search_kwargs={"k": 4})

        _THREAD_RETRIEVERS[str(thread_id)] = retriever
        _THREAD_METADATA[str(thread_id)] = {
            "filename": filename or os.path.basename(temp_path),
            "chunks": len(chunks),
        }

        return {"status": "processed", "chunks": len(chunks)}

    finally:
        try:
            os.remove(temp_path)
        except:
            pass


# -------------------
# 4. Tools
# -------------------
search_tool = DuckDuckGoSearchRun(region="us-en")


'''@tool

async def rag_tool(query: str, thread_id: Optional[str] = None) -> dict:
    """
    Retrieve relevant information from the uploaded PDF for a given thread.

    Args:
        query: User question
        thread_id: Chat thread identifier

    Returns:
        Retrieved context and metadata
    """
    retriever = _get_retriever(thread_id)

    if retriever is None:
        return {"error": "No PDF uploaded", "query": query}

    result = await retriever.ainvoke(query)

    return {
        "query": query,
        "context": [doc.page_content for doc in result],
        "metadata": [doc.metadata for doc in result],
    }'''


@tool
async def rag_tool(
    query: str,
    thread_id: Optional[str] = None,
) -> dict:
    """Retrieve relevant information from uploaded PDF or web for a given query."""

    retriever = _get_retriever(thread_id)

    if retriever is None:
        return {"error": "No PDF uploaded"}

    docs = await retriever.ainvoke(query)

    if not docs:

        rewrite = await rewrite_chain.ainvoke({"question": query})

        web_result = search_tool.invoke(rewrite.query)

        return {
            "query": query,
            "verdict": "NO_RETRIEVAL",
            "context": str(web_result),
        }

    scores = []
    good_docs = []

    # -------------------
    # Evaluate retrieval
    # -------------------
    for d in docs:

        out = await doc_eval_chain.ainvoke(
            {
                "question": query,
                "chunk": d.page_content,
            }
        )

        scores.append(out.score)

        if out.score > LOWER_TH:
            good_docs.append(d)

    # -------------------
    # CRAG Routing
    # -------------------

    # GOOD RETRIEVAL
    if any(s > UPPER_TH for s in scores):

        final_docs = good_docs

        verdict = "CORRECT"

    # BAD RETRIEVAL
    else:

        rewrite = await rewrite_chain.ainvoke({"question": query})

        web_result = search_tool.invoke(rewrite.query)

        web_doc = Document(
            page_content=str(web_result),
            metadata={"source": "web"},
        )

        # ambiguous => combine
        if any(s > LOWER_TH for s in scores):

            final_docs = good_docs + [web_doc]

            verdict = "AMBIGUOUS"

        # incorrect => web only
        else:

            final_docs = [web_doc]

            verdict = "INCORRECT"

    refined_context = "\n\n".join(d.page_content for d in final_docs)

    return {
        "query": query,
        "verdict": verdict,
        "context": refined_context,
    }


## CRAG
class DocEvalScore(BaseModel):
    score: float
    reason: str


## ADD EVALUATION PROMPT
doc_eval_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
You are a strict retrieval evaluator.

Return score between 0 and 1.

1 = highly relevant
0 = irrelevant

Return JSON only.
            """,
        ),
        (
            "human",
            "Question: {question}\n\nChunk:\n{chunk}",
        ),
    ]
)

## ADD EVALUATION CHAIN
doc_eval_chain = doc_eval_prompt | llm.with_structured_output(DocEvalScore)


## ADD QUERY REWRITER
class WebQuery(BaseModel):
    query: str


## ADD REWRITE PROMPT
rewrite_prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "Rewrite question into short web search query.",
        ),
        (
            "human",
            "Question: {question}",
        ),
    ]
)

## ADD REWRITE CHAIN
rewrite_chain = rewrite_prompt | llm.with_structured_output(WebQuery)


# -------------------
# 5. MCP Client
# -------------------
# MCP client for local FastMCP server
client = MultiServerMCPClient(
    {
        "math": {
            "transport": "stdio",
            "command": "C:\\Users\\Likhit Gaikwad\\AppData\\Roaming\\Python\\Python310\\Scripts\\uv.exe",
            "args": [
                "run",
                "fastmcp",
                "run",
                "C:\\Users\\Likhit Gaikwad\\Desktop\\mcp-math-server\\main.py",
            ],
        },
        "expense": {
            "transport": "streamable_http",
            "url": "https://binding-white-wolf.fastmcp.app/mcp",
            "headers": {
                "Authorization": "Bearer fmcp_h-ZjwngXZbZc1fcJ8VjIpMFbT2whvXz1ttMtDzMKYyg"
            },
        },
    }
)


async def load_mcp_tools() -> list[BaseTool]:
    try:
        return await client.get_tools()
    except Exception:
        return []


# -------------------
# 6. State
# -------------------
class ChatState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


# -------------------
# 7. Chat Node
# -------------------
def create_chat_node(llm_with_tools):
    async def chat_node(state: ChatState, config=None):
        thread_id = config.get("configurable", {}).get("thread_id") if config else None

        system_message = SystemMessage(content=f"""
You are a helpful assistant.

- Use rag_tool for uploaded PDF questions, factual retrieval, and document-related queries.
- rag_tool already performs corrective retrieval and automatic web fallback internally.
- Use other tools when needed.
- Current thread_id: {thread_id}
""")

        messages = [system_message, *state["messages"]]

        response = await llm_with_tools.ainvoke(messages, config=config)
        return {"messages": [response]}

    return chat_node


# -------------------
# 8. Init Chatbot (CRITICAL)
# -------------------
"""async def init_chatbot():
    # DB
    conn = await aiosqlite.connect("chatbot.db")
    checkpointer = AsyncSqliteSaver(conn)

    # MCP tools
    mcp_tools = await load_mcp_tools()

    # tools
    tools = [search_tool, rag_tool]
    tools.extend(mcp_tools)

    # bind tools
    llm_with_tools = llm.bind_tools(tools)

    # tool node
    tool_node = ToolNode(tools)

    # graph
    graph = StateGraph(ChatState)
    chat_node_fn = create_chat_node(llm_with_tools)
    graph.add_node("chat_node", chat_node_fn)
    graph.add_node("tools", tool_node)

    graph.add_edge(START, "chat_node")
    graph.add_conditional_edges("chat_node", tools_condition)
    graph.add_edge("tools", "chat_node")

    chatbot = graph.compile(checkpointer=checkpointer)

    return chatbot, checkpointer"""


async def init_chatbot():
    conn = await aiosqlite.connect("chatbot.db")
    checkpointer = AsyncSqliteSaver(conn)

    mcp_tools = await load_mcp_tools()

    tools = [search_tool, rag_tool]
    tools.extend(mcp_tools)

    llm_with_tools = llm.bind_tools(tools)
    tool_node = ToolNode(tools)

    graph = StateGraph(ChatState)
    chat_node_fn = create_chat_node(llm_with_tools)
    graph.add_node("chat_node", chat_node_fn)
    graph.add_node("tools", tool_node)

    graph.add_edge(START, "chat_node")
    graph.add_conditional_edges("chat_node", tools_condition)
    graph.add_edge("tools", "chat_node")

    chatbot = graph.compile(checkpointer=checkpointer)

    return chatbot, checkpointer


# -------------------
# 9. Helpers
# -------------------
async def retrieve_all_threads(checkpointer):
    threads = set()
    async for cp in checkpointer.alist(None):
        threads.add(cp.config["configurable"]["thread_id"])
    return list(threads)


def thread_has_document(thread_id: str) -> bool:
    return str(thread_id) in _THREAD_RETRIEVERS


def thread_document_metadata(thread_id: str) -> dict:
    return _THREAD_METADATA.get(str(thread_id), {})


# -------------------
# 10. Run Example
# -------------------
"""async def main():
    chatbot = await init_chatbot()

    response = await chatbot.ainvoke(
        {"messages": [HumanMessage(content="Hello")]},
        config={"configurable": {"thread_id": "1"}},
    )

    print(response["messages"][-1].content)


if __name__ == "__main__":
    asyncio.run(main())"""
