import React from "react";
import classNames from "classnames";

import { JourneyInfo, JourneyTransferSegment, Duration, JourneyTravelSegment } from "types";
import { HOUR, stringifyDuration } from "time";
import { getColorCodeForRouteId, isSilverLineRouteId } from "routes";

import { ComparisonProps } from "./types";
import ComparisonRow from "./ComparisonRow";

import styles from "./JourneyComparison.module.scss";

interface FrequencyInfoProps {
    journey: JourneyInfo;
    halfInterval?: Duration;
    arrivalStationId: string;
}

const getFirstStationAndRouteFromJourney = (journey: JourneyInfo) => {
    const [firstSegment] = [journey].map(
        (j) => j.segments.find((seg) => seg.kind === "travel") as JourneyTravelSegment
    );
    return { routeId: firstSegment?.routeId, stationId: firstSegment?.startStation?.id };
};

const getStationIdToCompare = (baseline: JourneyInfo, enhanced: JourneyInfo) => {
    const [{ stationId: baselineStationId }, { stationId: enhancedStationId }] = [
        baseline,
        enhanced,
    ].map(getFirstStationAndRouteFromJourney);

    return baselineStationId || enhancedStationId || null;
};

const FrequencyInfo = (props: FrequencyInfoProps) => {
    const { journey, arrivalStationId, halfInterval = HOUR * 1.25 } = props;
    if (journey.navigationFailed) {
        return <>No train is coming for this route.</>;
    }

    const { segments, arrivals } = journey;

    // Try to find arrivals data, checking both the original ID and "-parent" suffix
    let stationArrivals = arrivals?.[arrivalStationId];
    if (!stationArrivals && arrivals) {
        // Try with "-parent" suffix
        stationArrivals = arrivals[`${arrivalStationId}-parent`];
    }
    if (!stationArrivals && arrivals && arrivalStationId.endsWith("-parent")) {
        // Try removing "-parent" suffix
        const baseId = arrivalStationId.replace("-parent", "");
        stationArrivals = arrivals[baseId];
    }

    // Check if arrivals data exists for this station
    if (!stationArrivals || !stationArrivals.times) {
        return <>No arrival times available for this route.</>;
    }

    const { times } = stationArrivals;
    const arriveAtPlatform = (segments[0] as JourneyTransferSegment).startTime;
    const now = times.find((time) => time >= arriveAtPlatform);

    if (!now) {
        return <>No upcoming arrivals for this route.</>;
    }

    const shownTimes = times.filter((time) => Math.abs(time - now) <= halfInterval);
    const nextHeadwayIndex = shownTimes.findIndex((time) => time >= now);
    const nextArrival = shownTimes[nextHeadwayIndex];
    const subsequentArrival = shownTimes[nextHeadwayIndex + 1];
    const subsequentHeadway = subsequentArrival - nextArrival;
    const waitWidth = (50 * subsequentHeadway) / halfInterval;
    const waitLeft = 50 * (1 + (nextArrival - now) / halfInterval);
    const firstTravelSegment = journey.segments.find(
        (seg) => seg.kind === "travel"
    ) as JourneyTravelSegment;
    const noun = isSilverLineRouteId(firstTravelSegment.routeId) ? "bus" : "train";
    const text = Number.isFinite(subsequentHeadway) ? (
        <>
            Another {noun} is coming in {stringifyDuration(subsequentHeadway, true)}.
        </>
    ) : (
        <>
            Another {noun} isn't coming for at least {stringifyDuration(halfInterval, true)}.
        </>
    );
    return (
        <div className={styles.frequencyInfo}>
            <div className="timeline">
                <div className="line" />
                <div
                    className="wait-line"
                    style={{ left: `${waitLeft}%`, width: `${waitWidth}%` }}
                />
                {shownTimes.map((time, index) => {
                    const left = 50 * (1 + (time - now) / halfInterval);
                    const color = getColorCodeForRouteId(firstTravelSegment.routeId);
                    return (
                        <div
                            key={index}
                            style={{ left: `${left}%`, color: color }}
                            className={classNames(
                                "time",
                                index === nextHeadwayIndex && "missed",
                                index === nextHeadwayIndex + 1 && "caught"
                            )}
                        />
                    );
                })}
            </div>
            <div className="secondary">{text}</div>
        </div>
    );
};

const FrequencyComparison = (props: ComparisonProps) => {
    const { baseline, enhanced } = props;
    const idToCompare = getStationIdToCompare(baseline, enhanced);
    if (idToCompare) {
        return (
            <ComparisonRow
                title={`Missed your train?`}
                baseline={<FrequencyInfo journey={baseline} arrivalStationId={idToCompare} />}
                enhanced={<FrequencyInfo journey={enhanced} arrivalStationId={idToCompare} />}
            />
        );
    }
    return null;
};

export default FrequencyComparison;
