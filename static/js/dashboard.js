document.addEventListener('DOMContentLoaded', () => {
    const askAiBtn = document.getElementById('ask-ai-btn');
    const aiPromptInput = document.getElementById('ai-prompt-input');
    const aiChatBox = document.getElementById('ai-chat-box');

    // Function to add a message to the chat box
    const addMessageToChat = (message, sender) => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('ai-message', sender);
        // Using innerHTML to correctly render formatting like bold tags from the AI
        messageDiv.innerHTML = message;
        aiChatBox.appendChild(messageDiv);
        // Scroll to the latest message
        aiChatBox.scrollTop = aiChatBox.scrollHeight;
    };

    // Function to handle the API call to our backend
    const handleAskAI = async () => {
        const prompt = aiPromptInput.value.trim();
        if (!prompt) return;

        // Add user's message to the chat
        addMessageToChat(prompt, 'user');
        
        // Clear the input and show a thinking indicator
        aiPromptInput.value = '';
        const thinkingMessage = document.createElement('div');
        thinkingMessage.classList.add('ai-message', 'assistant');
        thinkingMessage.textContent = 'Thinking...';
        aiChatBox.appendChild(thinkingMessage);
        aiChatBox.scrollTop = aiChatBox.scrollHeight;

        try {
            const response = await fetch('/api/ask_gemini', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: prompt }),
            });

            // Remove the "Thinking..." message
            aiChatBox.removeChild(thinkingMessage);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Convert markdown-like formatting to HTML.
            let formattedResponse = data.response
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
                .replace(/\n/g, '<br>'); // Newlines

            addMessageToChat(formattedResponse, 'assistant');

        } catch (error) {
            console.error('Error asking AI:', error);
            // Also remove "Thinking..." on error
            if (aiChatBox.contains(thinkingMessage)) {
                 aiChatBox.removeChild(thinkingMessage);
            }
            addMessageToChat('Sorry, I encountered an error. Please try again.', 'assistant');
        }
    };

    // Event listeners
    askAiBtn.addEventListener('click', handleAskAI);
    aiPromptInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevents form submission if it were in a form
            handleAskAI();
        }
    });
});