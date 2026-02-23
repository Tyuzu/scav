import { meChat } from "../../mechat/plugnplay";

export async function farmChat(farmerId, farmId) {
    console.log(farmerId, farmId);
    meChat(farmerId, "farm", farmId);
}
