document.addEventListener('DOMContentLoaded', () => {
    const postsContainer = document.getElementById('posts-container');
    const createPostForm = document.getElementById('create-post-form');

    // --- RENDER FUNCTION ---
    // Creates the HTML for a single post and adds it to the page
    const renderPost = (post) => {
        const postCard = document.createElement('div');
        postCard.classList.add('post-card');
        postCard.dataset.id = post.id;

        // Sanitize content to prevent HTML injection, but allow line breaks
        const sanitizedContent = post.content.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');

        postCard.innerHTML = `
            <div class="post-header">
                <div class="post-info">
                    <h4 class="post-title">${post.title}</h4>
                    <span class="post-author">by @${post.username}</span>
                </div>
                <div class="post-meta">
                    <span class="post-type-badge">${post.post_type}</span>
                    ${post.can_delete ? `<button class="btn-delete post-delete-btn">Delete</button>` : ''}
                </div>
            </div>
            <p class="post-content">${sanitizedContent}</p>
        `;

        // Add event listener to the delete button if it exists
        if (post.can_delete) {
            postCard.querySelector('.post-delete-btn').addEventListener('click', () => deletePost(post.id));
        }

        postsContainer.prepend(postCard);
    };

    // --- API FUNCTIONS ---

    // 1. Fetch all posts from the server
    const fetchPosts = async () => {
        try {
            const response = await fetch('/api/posts');
            if (!response.ok) throw new Error('Failed to fetch posts');
            const posts = await response.json();
            postsContainer.innerHTML = ''; // Clear existing posts
            posts.forEach(renderPost);
        } catch (error) {
            console.error('Error fetching posts:', error);
        }
    };

    // 2. Create a new post
    const createPost = async (event) => {
        event.preventDefault();
        const formData = new FormData(createPostForm);
        const postData = Object.fromEntries(formData.entries());

        if (!postData.title || !postData.content) {
            alert('Title and content are required!');
            return;
        }

        try {
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(postData)
            });

            if (!response.ok) throw new Error('Failed to create post');
            const newPost = await response.json();
            renderPost(newPost); // Add the new post to the top of the list
            createPostForm.reset(); // Clear the form
        } catch (error) {
            console.error('Error creating post:', error);
        }
    };

    // 3. Delete a post
    const deletePost = async (postId) => {
        if (!confirm('Are you sure you want to delete this post?')) return;

        try {
            const response = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete post');
            document.querySelector(`.post-card[data-id='${postId}']`).remove();
        } catch (error) {
            console.error('Error deleting post:', error);
        }
    };


    // --- INITIALIZATION ---
    createPostForm.addEventListener('submit', createPost);
    fetchPosts(); // Initial fetch of all community posts
});
