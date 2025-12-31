function toggleMenu() {
            document.getElementById("nav-links").classList.toggle("show");
}

document.addEventListener("DOMContentLoaded", () =>{
    const sentBtn = document.querySelector(".pixel-btn-submit");
    const inputField = document.querySelector(".pixel-input");

    function senMessage(){
        const message = inputField.value;
        if  (message.trim===""){
            alert("[Error] Please enter a message before sending.");
            return;
        }
        alert("[Success] Your message has been sent: " + message);
        const email = "itachi@gmail.com";
        const subject = "Multiplayer Connection";
        const body = message;
        window.location.href = 'mailto:' + email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    }
    sentBtn.addEventListener("click", senMessage);
    inputField.addEventListener("keypress", (event) =>{
        if (event.key === "Enter"){
            senMessage();
        }
    });
});