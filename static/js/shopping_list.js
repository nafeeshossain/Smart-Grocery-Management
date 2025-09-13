document.addEventListener('DOMContentLoaded', () => {
    const shoppingList = document.getElementById('shopping-item-list');
    const addItemForm = document.getElementById('add-shopping-item-form');
    const itemNameInput = document.getElementById('shopping-item-name');

    // --- RENDER FUNCTION ---
    const renderShoppingItem = (item) => {
        const li = document.createElement('li');
        li.dataset.id = item.id;
        li.innerHTML = `
            <input type="checkbox" class="item-checkbox" ${item.is_checked ? 'checked' : ''}>
            <span class="item-name">${item.item_name}</span>
        `;
        if (item.is_checked) {
            li.classList.add('checked');
        }

        // Add event listener for checkbox changes
        const checkbox = li.querySelector('.item-checkbox');
        checkbox.addEventListener('change', () => updateItemStatus(item.id, checkbox.checked));
        
        // Add a delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Remove';
        deleteBtn.classList.add('btn-delete');
        deleteBtn.addEventListener('click', () => deleteItem(item.id));
        
        li.appendChild(deleteBtn);
        shoppingList.prepend(li);
    };

    // --- API FUNCTIONS ---

    // 1. Fetch all shopping list items
    const fetchItems = async () => {
        try {
            const response = await fetch('/api/shopping_list');
            if (!response.ok) throw new Error('Failed to fetch items');
            const items = await response.json();
            shoppingList.innerHTML = '';
            items.forEach(renderShoppingItem);
        } catch (error) {
            console.error('Error fetching shopping list:', error);
        }
    };

    // 2. Add a new item to the shopping list
    const addItem = async (event) => {
        event.preventDefault();
        const itemName = itemNameInput.value.trim();
        if (!itemName) return;

        try {
            const response = await fetch('/api/shopping_list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_name: itemName })
            });
            if (!response.ok) throw new Error('Failed to add item');
            const newItem = await response.json();
            renderShoppingItem(newItem);
            addItemForm.reset();
        } catch (error) {
            console.error('Error adding item:', error);
        }
    };

    // 3. Update an item's checked status
    const updateItemStatus = async (itemId, isChecked) => {
        try {
            const response = await fetch(`/api/shopping_list/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_checked: isChecked })
            });
            if (!response.ok) throw new Error('Failed to update item');
            // Visually update the item
            const li = document.querySelector(`li[data-id='${itemId}']`);
            li.classList.toggle('checked', isChecked);
        } catch (error) {
            console.error('Error updating item:', error);
        }
    };
    
    // 4. Delete an item from the shopping list
    const deleteItem = async (itemId) => {
        if (!confirm('Are you sure you want to remove this item?')) return;

        try {
            const response = await fetch(`/api/shopping_list/${itemId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete item');
            document.querySelector(`li[data-id='${itemId}']`).remove();
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    };

    // --- INITIALIZATION ---
    addItemForm.addEventListener('submit', addItem);
    fetchItems(); // Fetch and display items on page load
});
