import { Network } from "types";
import { createGtfsLoader } from "./load";
import { buildNetworkFromGtfs } from "./network";

export const loadGtfsNetwork = (archivePath: string) => {
    const loader = createGtfsLoader(archivePath);
    return buildNetworkFromGtfs(loader);
};

export const getStationsByIds = (network: Network, ...stationIds: string[]) => {
    return stationIds.map((id) => {
        if (network.stationsById[id]) {
            return network.stationsById[id];
        } else if (network.stationsById[`${id}-parent`]) {
            return network.stationsById[`${id}-parent`];
        }
        throw new Error(`No station by id ${id}`);
    });
};
