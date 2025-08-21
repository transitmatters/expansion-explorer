import { Network } from "types";
import { createGtfsLoader } from "./load";
import { buildNetworkFromGtfs } from "./network";

export const loadGtfsNetwork = (archivePath: string) => {
    const loader = createGtfsLoader(archivePath);
    return buildNetworkFromGtfs(loader);
};

export const getStationsByIds = (network: Network, ...stationIds: string[]) => {
    return stationIds.map((id) => {
        // Try the original ID first
        if (id === "75") {
            console.log("HELLO THERE");
            console.log(network.stationsById[id]);
        } else if (id == "75-parent") {
            console.log("HELLO THERE 2");
            console.log(network.stationsById[id]);
        }
        if (network.stationsById[id]) {
            return network.stationsById[id];
        }
        // // Try with "-parent" suffix
        // const parentId = `${id}-parent`;
        // if (network.stationsById[parentId]) {
        //     return network.stationsById[parentId];
        // }
        // // Try removing "-parent" suffix if the ID already has it
        // if (id.endsWith('-parent')) {
        //     const baseId = id.replace('-parent', '');
        //     if (network.stationsById[baseId]) {
        //         return network.stationsById[baseId];
        //     }
        // }
        throw new Error(`No station by id ${id}`);
    });
};
