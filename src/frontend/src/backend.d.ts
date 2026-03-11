import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ScoreData {
    bestScore: bigint;
    interactions: bigint;
}
export interface backendInterface {
    getLeaderboard(): Promise<Array<ScoreData>>;
    getScore(): Promise<ScoreData>;
    recordInteraction(newScore: bigint): Promise<void>;
}
