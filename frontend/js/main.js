// Shared frontend behavior for CampusConnect.
// Page logic will be added in a later stage.

document.addEventListener('DOMContentLoaded', () => {
  const yearElement = document.getElementById('year');

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  console.log('CampusConnect frontend loaded successfully');
});
