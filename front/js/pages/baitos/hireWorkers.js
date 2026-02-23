import { displayHireWorkers } from '../../services/baitos/workers/displayHires.js';

async function HireWorkers(isLoggedIn, contentContainer) {
    displayHireWorkers(isLoggedIn, contentContainer);
}

export { HireWorkers };
