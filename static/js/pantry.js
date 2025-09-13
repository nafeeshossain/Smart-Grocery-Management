document.addEventListener('DOMContentLoaded', () => {
    const pantryList = document.getElementById('pantry-item-list');
    const addItemForm = document.getElementById('add-pantry-item-form');
    const itemNameInput = document.getElementById('pantry-item-name');
    const itemQuantityInput = document.getElementById('pantry-item-quantity');
    const itemExpiryInput = document.getElementById('pantry-item-expiry');

    // --- RENDER FUNCTION ---
    // Creates and displays a single pantry item in the list
    const renderPantryItem = (item) => {
        const li = document.createElement('li');
        li.dataset.id = item.id;

        // Display text for the item
        let displayText = `<strong>${item.item_name}</strong>`;
        if (item.quantity) {
            displayText += ` - ${item.quantity}`;
        }
        if (item.expiry_date) {
            // Format date for better readability
            const expiry = new Date(item.expiry_date + 'T00:00:00'); // Treat as local timezone
            displayText += ` (Expires: ${expiry.toLocaleDateString()})`;
        }
        li.innerHTML = `<span>${displayText}</span>`;

        // Create a delete button for the item
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Remove';
        deleteBtn.classList.add('btn-delete');
        deleteBtn.addEventListener('click', () => deleteItem(item.id));
        
        li.appendChild(deleteBtn);
        pantryList.prepend(li); // Add new items to the top
    };

    // --- API FUNCTIONS ---

    // 1. Fetch all pantry items from the server
    const fetchItems = async () => {
        try {
            const response = await fetch('/api/pantry');
            if (!response.ok) throw new Error('Failed to fetch items');
            const items = await response.json();
            pantryList.innerHTML = ''; // Clear the list before rendering
            items.forEach(renderPantryItem);
        } catch (error) {
            console.error('Error fetching pantry items:', error);
        }
    };

    // 2. Add a new item to the pantry
    const addItem = async (event) => {
        event.preventDefault(); // Prevent default form submission
        const itemName = itemNameInput.value.trim();
        const quantity = itemQuantityInput.value.trim();
        const expiryDate = itemExpiryInput.value;

        if (!itemName) return;

        try {
            const response = await fetch('/api/pantry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    item_name: itemName,
                    quantity: quantity,
                    expiry_date: expiryDate
                })
            });
            if (!response.ok) throw new Error('Failed to add item');
            const newItem = await response.json();
            renderPantryItem(newItem); // Add the new item to the UI
            addItemForm.reset(); // Clear the form fields
        } catch (error) {
            console.error('Error adding item:', error);
        }
    };

    // 3. Delete an item from the pantry
    const deleteItem = async (itemId) => {
        if (!confirm('Are you sure you want to remove this item?')) return;
        
        try {
            const response = await fetch(`/api/pantry/${itemId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete item');
            document.querySelector(`li[data-id='${itemId}']`).remove(); // Remove item from UI
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    };

    // --- INITIALIZATION ---
    addItemForm.addEventListener('submit', addItem);
    fetchItems(); // Fetch and display items when the page loads
});
