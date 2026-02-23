import { createElement } from "../components/createElement";

async function About(concon) {
    console.log(concon);
    concon.append(createElement("p", {}, "About"));
}

async function Contact(concon) {
    console.log(concon);
    concon.append(createElement("p", {}, "Contact"));

}

async function Faq(concon) {
    console.log(concon);
    concon.append(createElement("p", {}, "Faq"));

}

async function Terms(concon) {
    console.log(concon);
    concon.append(createElement("p", {}, "Terms"));

}

async function Privacy(concon) {
    console.log(concon);
    concon.append(createElement("p", {}, "Privacy"));

}

async function Refund(concon) {
    console.log(concon);
    concon.append(createElement("p", {}, "Refund"));

}

async function Shipping(concon) {
    console.log(concon);
    concon.append(createElement("p", {}, "Shipping"));

}

async function Returns(concon) {
    console.log(concon);
    concon.append(createElement("p", {}, "Returns"));

}

async function Disclaimer(concon) {
    console.log(concon);
    concon.append(createElement("p", {}, "Disclaimer"));

}

async function Blog(concon) {
    console.log(concon);
    concon.append(createElement("p", {}, "Blog"));

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

