function showSection(id) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(s => s.style.display = 'none');

    const selected = document.getElementById(id);
    if (selected) {
        selected.style.display = 'block';
    }
}
