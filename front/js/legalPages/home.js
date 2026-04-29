import { createElement } from "../components/createElement";

function section(title, text) {
  return createElement("section", {}, [
    createElement("h2", {}, title),
    createElement("p", {}, text),
  ]);
}

async function About(concon) {
  concon.append(
    createElement("div", {}, [
      createElement("h1", {}, "About Us"),
      section(
        "Who We Are",
        "We build reliable and scalable web solutions focused on performance, usability, and simplicity."
      ),
      section(
        "Our Mission",
        "To deliver efficient digital experiences without unnecessary complexity."
      ),
    ])
  );
}

async function Contact(concon) {
  concon.append(
    createElement("div", {}, [
      createElement("h1", {}, "Contact"),
      section("Email", "support@example.com"),
      section("Phone", "+1 (000) 000-0000"),
      section("Address", "123 Example Street, City, Country"),
    ])
  );
}

async function Faq(concon) {
  concon.append(
    createElement("div", {}, [
      createElement("h1", {}, "FAQ"),
      section("How do I use this service?", "Create an account and follow the onboarding steps."),
      section("Can I cancel anytime?", "Yes, you can cancel at any time from your account settings."),
      section("Do you offer support?", "Support is available via email."),
    ])
  );
}

async function Terms(concon) {
  concon.append(
    createElement("div", {}, [
      createElement("h1", {}, "Terms of Service"),
      section(
        "Usage",
        "By using this service, you agree to comply with applicable laws and our policies."
      ),
      section(
        "Limitations",
        "We are not liable for damages resulting from misuse of the service."
      ),
    ])
  );
}

async function Privacy(concon) {
  concon.append(
    createElement("div", {}, [
      createElement("h1", {}, "Privacy Policy"),
      section(
        "Data Collection",
        "We collect only necessary data to provide and improve our services."
      ),
      section(
        "Data Usage",
        "Your data is never sold and is used strictly for operational purposes."
      ),
    ])
  );
}

async function Refund(concon) {
  concon.append(
    createElement("div", {}, [
      createElement("h1", {}, "Refund Policy"),
      section(
        "Eligibility",
        "Refunds are available within 14 days of purchase under valid conditions."
      ),
      section(
        "Process",
        "Contact support with your order details to request a refund."
      ),
    ])
  );
}

async function Shipping(concon) {
  concon.append(
    createElement("div", {}, [
      createElement("h1", {}, "Shipping Policy"),
      section(
        "Delivery Time",
        "Orders are processed within 2–5 business days."
      ),
      section(
        "Tracking",
        "Tracking details will be provided once shipped."
      ),
    ])
  );
}

async function Returns(concon) {
  concon.append(
    createElement("div", {}, [
      createElement("h1", {}, "Returns"),
      section(
        "Return Window",
        "Items can be returned within 30 days of delivery."
      ),
      section(
        "Condition",
        "Returned items must be unused and in original packaging."
      ),
    ])
  );
}

async function Disclaimer(concon) {
  concon.append(
    createElement("div", {}, [
      createElement("h1", {}, "Disclaimer"),
      section(
        "General",
        "All information is provided without warranties of any kind."
      ),
      section(
        "Liability",
        "We are not responsible for any losses arising from use of this site."
      ),
    ])
  );
}

async function Blog(concon) {
  concon.append(
    createElement("div", {}, [
      createElement("h1", {}, "Blog"),
      section(
        "Latest Updates",
        "Insights, updates, and technical articles will appear here."
      ),
    ])
  );
}

export {
  About,
  Contact,
  Faq,
  Terms,
  Privacy,
  Refund,
  Shipping,
  Returns,
  Disclaimer,
  Blog,
};