import os
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import sqlite3
import bcrypt
from database import create_database
import google.generativeai as genai

try:
    genai.configure(api_key="AIzaSyB6oaF1sHo6fZi_0DQ2aHb0dUg74JLJVaQ") 
except Exception as e:
    print(f"Error configuring Gemini API: {e}")

app = Flask(__name__)
app.secret_key = 'your_very_secret_key_for_pantrypal'
DATABASE = 'pantrypal.db'

# --- Database Helper Functions ---
def get_db_connection():
    """Establishes a connection to the database."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

# --- User Authentication Routes (No Changes) ---
@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password'].encode('utf-8')
        hashed_password = bcrypt.hashpw(password, bcrypt.gensalt())
        conn = get_db_connection()
        try:
            conn.execute(
                'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                (username, email, hashed_password)
            )
            conn.commit()
        except sqlite3.IntegrityError:
            return render_template('signup.html', error='Username or email already exists.')
        finally:
            conn.close()
        conn = get_db_connection()
        user = conn.execute('SELECT id, username FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()
        if user:
            session['user_id'] = user['id']
            session['username'] = user['username']
        return redirect(url_for('dashboard'))
    return render_template('signup.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password'].encode('utf-8')
        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()
        if user and bcrypt.checkpw(password, user['password']):
            session['username'] = user['username']
            session['user_id'] = user['id']
            return redirect(url_for('dashboard'))
        else:
            return render_template('login.html', error='Invalid username or password.')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('username', None)
    session.pop('user_id', None)
    return redirect(url_for('index'))

# --- Core Application Routes (No Changes) ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('dashboard.html', username=session['username'])

@app.route('/profile')
def profile():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    conn = get_db_connection()
    user = conn.execute('SELECT id, username, email, created_at FROM users WHERE id = ?', (session['user_id'],)).fetchone()
    conn.close()
    if not user:
        return redirect(url_for('logout'))
    return render_template('profile.html', user=user)

@app.route('/pantry')
def pantry():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('pantry.html')

@app.route('/shopping_list')
def shopping_list():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('shopping_list.html')

# --- NEW: Community Page Route ---
@app.route('/community')
def community():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('community.html')


# --- ================================== ---
# --- API Routes for Dynamic Functionality ---
# --- ================================== ---

# --- PANTRY API (No Changes) ---
@app.route('/api/pantry', methods=['GET'])
def get_pantry_items():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db_connection()
    items = conn.execute('SELECT id, item_name, quantity, expiry_date FROM pantry_items WHERE user_id = ? ORDER BY added_at DESC', 
                         (session['user_id'],)).fetchall()
    conn.close()
    return jsonify([dict(item) for item in items])

@app.route('/api/pantry', methods=['POST'])
def add_pantry_item():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json
    item_name = data.get('item_name')
    quantity = data.get('quantity')
    expiry_date = data.get('expiry_date') or None
    if not item_name:
        return jsonify({'error': 'Item name is required'}), 400
    conn = get_db_connection()
    cursor = conn.execute('INSERT INTO pantry_items (user_id, item_name, quantity, expiry_date) VALUES (?, ?, ?, ?)',
               (session['user_id'], item_name, quantity, expiry_date))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': new_id, 'item_name': item_name, 'quantity': quantity, 'expiry_date': expiry_date}), 201

@app.route('/api/pantry/<int:item_id>', methods=['DELETE'])
def delete_pantry_item(item_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db_connection()
    conn.execute('DELETE FROM pantry_items WHERE id = ? AND user_id = ?', (item_id, session['user_id']))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# --- SHOPPING LIST API (No Changes) ---
@app.route('/api/shopping_list', methods=['GET'])
def get_shopping_list():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db_connection()
    items = conn.execute('SELECT id, item_name, is_checked FROM shopping_list WHERE user_id = ? ORDER BY added_at DESC',
                         (session['user_id'],)).fetchall()
    conn.close()
    return jsonify([dict(item) for item in items])

@app.route('/api/shopping_list', methods=['POST'])
def add_shopping_list_item():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json
    item_name = data.get('item_name')
    if not item_name:
        return jsonify({'error': 'Item name is required'}), 400
    conn = get_db_connection()
    cursor = conn.execute('INSERT INTO shopping_list (user_id, item_name) VALUES (?, ?)',
               (session['user_id'], item_name))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': new_id, 'item_name': item_name, 'is_checked': 0}), 201

@app.route('/api/shopping_list/<int:item_id>', methods=['PUT'])
def update_shopping_list_item(item_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json
    is_checked = data.get('is_checked')
    conn = get_db_connection()
    conn.execute('UPDATE shopping_list SET is_checked = ? WHERE id = ? AND user_id = ?',
                 (is_checked, item_id, session['user_id']))
    conn.commit()
    conn.close()
    return jsonify({'success': True})
    
@app.route('/api/shopping_list/<int:item_id>', methods=['DELETE'])
def delete_shopping_list_item(item_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db_connection()
    conn.execute('DELETE FROM shopping_list WHERE id = ? AND user_id = ?', (item_id, session['user_id']))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# --- NEW: COMMUNITY API ---
@app.route('/api/posts', methods=['GET'])
def get_posts():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    conn = get_db_connection()
    posts_rows = conn.execute('''
        SELECT p.id, p.title, p.content, p.post_type, p.user_id, u.username 
        FROM community_posts p 
        JOIN users u ON p.user_id = u.id 
        ORDER BY p.created_at DESC
    ''').fetchall()
    conn.close()
    
    # Add a 'can_delete' flag to each post
    posts = []
    for post in posts_rows:
        post_dict = dict(post)
        post_dict['can_delete'] = (post['user_id'] == session['user_id'])
        posts.append(post_dict)
        
    return jsonify(posts)

@app.route('/api/posts', methods=['POST'])
def create_post():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    title = data.get('title')
    content = data.get('content')
    post_type = data.get('post_type')
    
    if not all([title, content, post_type]):
        return jsonify({'error': 'All fields are required'}), 400
        
    conn = get_db_connection()
    cursor = conn.execute('INSERT INTO community_posts (user_id, title, content, post_type) VALUES (?, ?, ?, ?)',
                          (session['user_id'], title, content, post_type))
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    
    # Return the new post data, including username and can_delete flag
    return jsonify({
        'id': new_id,
        'title': title,
        'content': content,
        'post_type': post_type,
        'username': session['username'],
        'can_delete': True
    }), 201

@app.route('/api/posts/<int:post_id>', methods=['DELETE'])
def delete_post(post_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    conn = get_db_connection()
    # Ensure user can only delete their own posts
    conn.execute('DELETE FROM community_posts WHERE id = ? AND user_id = ?', (post_id, session['user_id']))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


# --- Gemini AI API (No Changes) ---
@app.route('/api/ask_gemini', methods=['POST'])
def ask_gemini():
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    user_prompt = data.get('prompt')
    if not user_prompt:
        return jsonify({'error': 'Prompt is required'}), 400

    # 1. Fetch user's pantry items
    conn = get_db_connection()
    pantry_items_rows = conn.execute('SELECT item_name FROM pantry_items WHERE user_id = ?', (session['user_id'],)).fetchall()
    conn.close()
    
    pantry_list = [item['item_name'] for item in pantry_items_rows]
    pantry_list_str = ", ".join(pantry_list) if pantry_list else "nothing"

    # 2. Construct a detailed prompt for the AI
    full_prompt = (
        "You are a helpful kitchen assistant called Smart Grocer AI. "
        "Your goal is to provide creative and practical recipes based on the ingredients a user has. "
        f"The user has the following items in their pantry: {pantry_list_str}. "
        f"The user's specific request is: '{user_prompt}'. "
        "Please provide a clear, easy-to-follow recipe. If the pantry is empty or the ingredients don't make sense for the request, "
        "politely mention that and provide a more general recipe related to their request. "
        "Use markdown for formatting, like **bold titles** and bullet points for ingredients and steps."
    )

    # 3. Call the Gemini API
    try:
        # ** THE FIX IS HERE: Updated the model name from 'gemini-pro' **
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(full_prompt)
        ai_response = response.text
    except Exception as e:
        print(f"Gemini API Error: {e}")
        ai_response = "Sorry, I'm having trouble connecting to my brain right now. Please check the API key and try again later."

    return jsonify({'response': ai_response})


if __name__ == '__main__':
    if not os.path.exists(DATABASE):
        print("Database not found, creating it now...")
        create_database()
        print("Database created successfully.")
    app.run(debug=True)

