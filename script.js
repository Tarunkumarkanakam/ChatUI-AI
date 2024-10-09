// Base URL for the API
const BASE_URL = 'http://localhost:4000';

// Select elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const modelSelect = document.getElementById('model-select');
const startChatButton = document.getElementById('start-chat-button');
const modelSelectionDiv = document.getElementById('model-selection');
const chatContainer = document.getElementById('chat-container');

// Initialize conversation history
let conversation = [];
let selectedModel = '';

// Function to fetch available models
async function fetchModels() {
    try {
        const response = await fetch(
            `${BASE_URL}/models`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer sk-1234'
                // Add other headers if required
            },
        }
        );
        const data = await response.json();
        const models = data.data;

        // Populate the model select dropdown
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.id;
            modelSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching models:', error);
        alert('Failed to fetch models. Please try again later.');
    }
}

// Function to add a message to the chat window
function addMessage(sender, text, isMarkdown = false) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);

    const contentElement = document.createElement('div');
    contentElement.classList.add('content');

    if (isMarkdown) {
        // Parse Markdown and sanitize HTML
        const html = marked.parse(text);
        const sanitizedHtml = DOMPurify.sanitize(html);
        contentElement.innerHTML = sanitizedHtml;
    } else {
        contentElement.textContent = text;
    }

    messageElement.appendChild(contentElement);
    chatMessages.appendChild(messageElement);

    // Scroll to the bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return contentElement; // Return the content element for updates
}

// Function to handle sending a message with streaming support
async function sendMessage() {
    const messageText = userInput.value.trim();
    if (messageText === '') return;

    // Add user's message to the chat window
    addMessage('user', messageText);

    // Add user's message to the conversation history
    conversation.push({ role: 'user', content: messageText });

    // Clear the input field
    userInput.value = '';

    // Create a new message element for the bot's response
    const botContentElement = addMessage('bot', '', true); // Set isMarkdown to true

    // Call the API with streaming
    try {
        const response = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer sk-1234'
                // Add other headers if required
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: conversation,
                stream: true
                // Add other parameters if needed
            })
        });

        if (!response.ok) {
            throw new Error(response.statusText);
        }

        // Read the response stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let botMessage = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);

            // Process the chunk
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6);
                    if (data === '[DONE]') {
                        break;
                    }
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices[0].delta.content;
                        if (content) {
                            botMessage += content;
                            // Parse and sanitize the Markdown content
                            const html = marked.parse(botMessage);
                            const sanitizedHtml = DOMPurify.sanitize(html);
                            botContentElement.innerHTML = sanitizedHtml;
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                    } catch (e) {
                        console.error('Error parsing data:', e);
                    }
                }
            }
        }

        // Add assistant's response to the conversation history
        conversation.push({ role: 'assistant', content: botMessage });

    } catch (error) {
        console.error('Error:', error);
        botContentElement.textContent = 'Sorry, an error occurred.';
    }
}

// Function to start the chat
function startChat() {
    selectedModel = modelSelect.value;
    if (!selectedModel) {
        alert('Please select a model to start the chat.');
        return;
    }

    // Initialize conversation with system message
    conversation = [
        { role: 'system', content: `You are a helpful assistant using the model ${selectedModel}.` }
    ];

    // Hide model selection and show chat container
    modelSelectionDiv.style.display = 'none';
    chatContainer.style.display = 'flex';
}

// Event listeners
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

startChatButton.addEventListener('click', startChat);

// Fetch models on page load
fetchModels();
