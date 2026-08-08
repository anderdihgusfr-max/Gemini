import * as webllm from "https://esm.run/@mlc-ai/web-llm";

const chatContainer = document.getElementById("chatContainer");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const modelSelect = document.getElementById("modelSelect");
const progressContainer = document.getElementById("progressContainer");
const progressText = document.getElementById("progressText");
const exportBtn = document.getElementById("exportBtn");

let engine = null;
let currentModel = modelSelect.value;

async function initEngine() {
    progressContainer.classList.remove("hidden");
    engine = new webllm.MLCEngine();
    
    engine.setInitProgressCallback((report) => {
        progressText.textContent = report.text;
    });

    await engine.reload(currentModel);
    progressContainer.classList.add("hidden");
}

await initEngine();

modelSelect.addEventListener("change", async (e) => {
    currentModel = e.target.value;
    appendSystemMessage(`Switching model to ${currentModel}...`);
    await initEngine();
    appendSystemMessage("Model loaded successfully.");
});

async function handleSend() {
    const text = userInput.value.trim();
    if (!text || !engine) return;

    userInput.value = "";
    appendMessage("user", text);

    const botMessageDiv = appendMessage("assistant", "");
    
    const messages = [{ role: "user", content: text }];
    
    try {
        const completion = await engine.chat.completions.create({
            stream: true,
            messages: messages,
        });

        let fullResponse = "";
        for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta?.content || "";
            fullResponse += delta;
            botMessageDiv.innerHTML = marked.parse(fullResponse);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    } catch (err) {
        botMessageDiv.textContent = `Error executing model: ${err.message}`;
    }
}

function appendMessage(role, text) {
    const isUser = role === "user";
    const wrapper = document.createElement("div");
    wrapper.className = `flex items-start space-x-4 ${isUser ? "flex-row-reverse space-x-reverse" : ""}`;
    
    const avatar = document.createElement("div");
    avatar.className = `w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${isUser ? "bg-purple-600" : "bg-blue-500"}`;
    avatar.textContent = isUser ? "U" : "G";

    const bubble = document.createElement("div");
    bubble.className = `p-4 rounded-2xl max-w-[80%] border text-sm ${isUser ? "bg-[#2B2D31] border-[#444746]" : "bg-[#1E1F20] border-[#333538]"}`;
    
    if (text) bubble.innerHTML = marked.parse(text);

    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);
    chatContainer.appendChild(wrapper);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    return bubble;
}

function appendSystemMessage(text) {
    const div = document.createElement("div");
    div.className = "text-center text-xs text-gray-500 my-2";
    div.textContent = text;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Extended Feature: Chat Export to Markdown
exportBtn.addEventListener("click", () => {
    const chatHTML = chatContainer.innerHTML;
    const blob = new Blob([chatHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gemini-chat-export.html";
    a.click();
});

sendBtn.addEventListener("click", handleSend);
userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});
