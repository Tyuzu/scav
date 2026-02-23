// pages/auth.js
import { login, signup } from "../../services/auth/authService.js";
import { getState, subscribeDeep } from "../../state/state.js";
import { createElement } from "../../components/createElement.js";
import { navigate } from "../../routes/index.js";

// --- Main entry
export function Auth(isL, contentContainer) {
  clearContainer(contentContainer);
  renderAuthSection(isL, contentContainer);

  // Reactive update when token changes
  subscribeDeep("token", () => {
    clearContainer(contentContainer);
    renderAuthSection(isL, contentContainer);
  });
}

// --- helper: clear container without innerHTML ---
function clearContainer(el) {
  while (el.firstChild) el.firstChild.remove();
}

// --- Core UI Renderer
function renderAuthSection(isL, contentContainer) {
  clearContainer(contentContainer);

  // If user is already logged in, use navigate (do not write directly to href)
  if (getState("token")) {
    navigate("/home");
    return;
  }

  const wrapper = createElement("div", { class: "auth-wrapper" }, []);
  const authBox = createElement("div", { class: "auth-box" }, []);

  const loginForm = createLoginForm();
  const divider = createElement("div", { class: "auth-divider" }, ["or"]);
  const signupForm = createSignupForm();

  authBox.append(loginForm, divider, signupForm);
  wrapper.append(authBox);
  contentContainer.append(wrapper);
}

// --- Login form
function createLoginForm() {
  const section = createElement("section", { class: "auth-section" }, []);
  const title = createElement("h2", { class: "auth-title" }, ["Log In"]);

  const usernameInput = inputField("text", "Username", "login-username", "username");
  const passwordInput = inputField("password", "Password", "login-password", "current-password");
  const submitBtn = submitButton("Login");

  const form = createElement("form", { class: "auth-form" }, []);
  form.append(usernameInput, passwordInput, submitBtn);
  form.addEventListener("submit", login);

  section.append(title, form);
  return section;
}

// --- Signup form
function createSignupForm() {
  const section = createElement("section", { class: "auth-section" }, []);
  const title = createElement("h2", { class: "auth-title" }, ["Sign Up"]);

  const usernameInput = inputField("text", "Username", "signup-username", "username");
  const emailInput = inputField("email", "Email", "signup-email", "email");
  const passwordInput = inputField("password", "Password", "signup-password", "new-password");

  const checkbox = createElement("input", { type: "checkbox", id: "signup-terms", required: true }, []);
  const termsLabel = createElement("label", { class: "auth-terms" }, [" I agree to the Terms & Conditions"]);
  // insert checkbox before text
  termsLabel.insertBefore(checkbox, termsLabel.firstChild);

  const submitBtn = submitButton("Signup");
  const form = createElement("form", { class: "auth-form" }, []);
  form.append(emailInput, usernameInput, passwordInput, termsLabel, submitBtn);

  form.addEventListener("submit", (e) => {
    if (!document.getElementById("signup-terms").checked) {
      e.preventDefault();
      // non-blocking notify
      import("../../components/ui/Notify.mjs").then(({ default: Notify }) => {
        Notify("You must agree to the Terms & Conditions.", { type: "warning", duration: 3000 });
      });
      return;
    }
    signup(e);
  });

  section.append(title, form);
  return section;
}

// --- Helper: Input
function inputField(type, placeholder, id, autocomplete = "") {
  const attrs = { type, id, placeholder, required: true };
  if (autocomplete) attrs.autocomplete = autocomplete;
  return createElement("input", attrs, []);
}

// --- Helper: Button
function submitButton(label) {
  // keep simple; createElement will produce a <button>
  return createElement("button", { type: "submit" }, [label]);
}
