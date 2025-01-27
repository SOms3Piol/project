const btn = document.getElementById('mbl-btn');
const menu = document.getElementById('menu')
const loader = document.getElementById('loader');
const c_btn = document.getElementById('close-btn')



btn.addEventListener('click' , ()=>{
    menu.classList.toggle('open')
})
c_btn.addEventListener('click' , ()=>{
  menu.classList.toggle('open')
})



window.addEventListener('beforeunload', function() {
  document.getElementById('loader').style.display = 'block';
});
window.addEventListener('pageshow', function() {
  document.getElementById('loader').style.display = 'none';
});
// Handle back/forward navigation (pageshow fires for cache as well)
window.addEventListener('load', function(){
  document.getElementById('loader').style.display = 'none';
});
// Hide the loader when the page is fully loaded


document.addEventListener("DOMContentLoaded", () => {

 
    const products = document.querySelectorAll(".animated-product");
  
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Add the "visible" class to trigger the animation
            entry.target.classList.add("visible");
          }
        });
      },
      {
        threshold: 0.1, // Trigger when 10% of the element is visible
      }
    );
  
    // Observe each product
    products.forEach((product) => observer.observe(product));
  });
  



async function createSession(priceId) {

    try {
        const response = await fetch('/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ priceId })
        });

        const session = await response.json();

        if (session.url) {
            window.location.href = session.url; // Redirect to Stripe Checkout
        } else {
            alert("Failed to create checkout session.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred while processing your request.");
    }
}
