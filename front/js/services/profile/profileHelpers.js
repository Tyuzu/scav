import Datex from "../../components/base/Datex";

// Utility function to format dates
function formatDate(dateString) {
    // return dateString ? new Date(dateString).toLocaleString() : null;
    return dateString ? Datex(dateString) : null;
}

function showLoadingMessage(message) {
    const loadingMsg = document.createElement("p");
    loadingMsg.id = "loading-msg";
    loadingMsg.textContent = message;
    document.getElementById("content").appendChild(loadingMsg);
}

function removeLoadingMessage() {
    const loadingMsg = document.getElementById("loading-msg");
    if (loadingMsg) loadingMsg.remove();
}

function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Preview profile picture
function previewAvatar(event) {
    const file = event.target.files[0];
    const preview = document.getElementById("profile-picture-preview");

    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            preview.src = reader.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

export {formatDate, showLoadingMessage, removeLoadingMessage, capitalize, previewAvatar};