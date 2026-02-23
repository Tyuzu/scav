import {createOrEditBaito} from "./createOrEditBaito";
async function createBaito(isLoggedIn, contentContainer) {
    createOrEditBaito({ 
        isLoggedIn: isLoggedIn, 
        contentContainer: contentContainer 
    });
}


export { createBaito };
