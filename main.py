from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import uuid
import json

from langchain_core.messages import HumanMessage, AIMessage, ToolMessage

from be_new import (
    init_chatbot,
    ingest_pdf,
    thread_has_document,
    thread_document_metadata,
)

app = FastAPI(title="Aether OS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

chatbot = None
checkpointer = None


@app.on_event("startup")
async def startup():
    global chatbot, checkpointer
    chatbot, checkpointer = await init_chatbot()


class ChatRequest(BaseModel):
    message: str
    thread_id: str


class ChatResponse(BaseModel):
    reply: str
    thread_id: str
    tools_used: list = []


class NewThreadResponse(BaseModel):
    thread_id: str


@app.get("/")
def root():
    return {"status": "Aether OS API is running"}


@app.post("/new-thread", response_model=NewThreadResponse)
def new_thread():
    return {"thread_id": str(uuid.uuid4())}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        response = await chatbot.ainvoke(
            {"messages": [HumanMessage(content=request.message)]},
            config={"configurable": {"thread_id": request.thread_id}},
        )

        last_message = response["messages"][-1]
        if isinstance(last_message.content, list):
            reply = last_message.content[0]["text"]
        else:
            reply = last_message.content

        # Extract tools used
        tools_used = []
        for msg in response["messages"]:
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                for tc in msg.tool_calls:
                    tool_name = tc.get("name", "")
                    if tool_name and tool_name not in tools_used:
                        tools_used.append(tool_name)

        return {
            "reply": reply,
            "thread_id": request.thread_id,
            "tools_used": tools_used,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/upload-pdf")
async def upload_pdf(thread_id: str, file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()
        result = ingest_pdf(file_bytes, thread_id, file.filename)
        return {
            "status": "success",
            "filename": file.filename,
            "chunks": result["chunks"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/thread-info/{thread_id}")
def thread_info(thread_id: str):
    has_doc = thread_has_document(thread_id)
    metadata = thread_document_metadata(thread_id)
    return {"thread_id": thread_id, "has_document": has_doc, "metadata": metadata}


@app.get("/threads")
async def get_threads():
    thread_map = {}
    async for cp in checkpointer.alist(None):
        tid = cp.config["configurable"]["thread_id"]
        if tid not in thread_map:
            messages = cp.checkpoint.get("channel_values", {}).get("messages", [])
            name = tid
            for msg in messages:
                if hasattr(msg, "content") and msg.__class__.__name__ == "HumanMessage":
                    content = msg.content
                    if isinstance(content, list):
                        content = content[0]["text"]
                    name = content[:30] + "..." if len(content) > 30 else content
                    break
            thread_map[tid] = {"id": tid, "name": name}

    threads = list(thread_map.values())
    return {"threads": threads}


@app.get("/history/{thread_id}")
async def get_history(thread_id: str):
    config = {"configurable": {"thread_id": thread_id}}
    state = await chatbot.aget_state(config)

    messages = []
    for msg in state.values.get("messages", []):
        if hasattr(msg, "content"):
            content = msg.content
            if isinstance(content, list):
                content = content[0]["text"]
            role = "user" if msg.__class__.__name__ == "HumanMessage" else "assistant"
            if isinstance(content, str):
                messages.append({"role": role, "content": content})

    return {"messages": messages}


@app.delete("/threads/{thread_id}")
async def delete_thread(thread_id: str):
    try:
        config = {"configurable": {"thread_id": thread_id}}
        await checkpointer.adelete(config)
        return {"status": "deleted", "thread_id": thread_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
