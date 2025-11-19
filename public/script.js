document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = new FormData(this);
    const data = new URLSearchParams(formData);

    const response = await fetch('/login', {
        method: 'POST',
        body: data,
    });

    const messageDiv = document.getElementById('message');
    if (response.ok) {
        messageDiv.style.color = 'green';
        messageDiv.textContent = await response.text();
    } else {
        messageDiv.style.color = 'red';
        messageDiv.textContent = await response.text();
    }
});
