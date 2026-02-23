
// Components
function createButton({ text, classes = [], id = '', events = {} }) {
    const button = document.createElement('button');
    button.textContent = text;
    button.classList.add(...classes);
    if (id) button.id = id;

    for (const event in events) {
        button.addEventListener(event, events[event]);
    }

    return button;
}

function createDivButton({ text, classes = [], id = '', events = {} }) {
    const button = document.createElement('div');
    button.textContent = text;
    button.classList.add(...classes);
    if (id) button.id = id;

    for (const event in events) {
        button.addEventListener(event, events[event]);
    }

    return button;
}

// function createButton({ text, classes = [], id = '', events = {} }) {
//     const button = document.createElement('button');
//     button.textContent = text;
//     button.classList.add(...classes);
//     if (id) button.id = id;

//     for (const event in events) {
//         button.addEventListener(event, events[event]);
//     }

//     return button;
// }

function createHeading(tag, text, classes = []) {
    const heading = document.createElement(tag);
    heading.textContent = text;
    heading.classList.add(...classes);
    return heading;
}

function createList(id, classes = []) {
    const list = document.createElement('ul');
    list.id = id;
    list.classList.add(...classes);
    return list;
}

function createLink(id, classes = []) {
    const link = document.createElement('a');
    link.id = id;
    link.classList.add(...classes);
    return link;
}

function createContainer(classes = [], id = '', containerType = 'div') {
    const container = document.createElement(containerType);
    container.classList.add(...classes);
    if (id) container.id = id;
    return container;
}

function createImage({ src, alt, classes = [] }) {
    const image = document.createElement('img');
    image.src = src;
    image.loading = "lazy";
    image.alt = alt;
    image.classList.add(...classes);
    return image;
}

export {createButton, createHeading, createList, createContainer, createImage, createLink, createDivButton};