export enum GuardExitCode {
    Success = 0,
    ConditionFailed = 1,
    BadInstructionData = 2,
    InvalidAccount = 3,
}

export const GuardLogMessage = {
    slotDeadline: {
        conditionFailed: "deadline missed",
        badInstructionData: "bad ix data",
    },
    slippage: {
        conditionFailed: "insufficient",
        badInstructionData: "bad ix data",
    },
    balanceFloor: {
        conditionFailed: "below floor",
        badInstructionData: "bad ix data",
    },
    feeCeiling: {
        conditionFailed: "fee too high",
        badInstructionData: "bad ix data",
        invalidAccount: "bad account",
    },
    programAllowlist: {
        conditionFailed: "not allowed",
        badInstructionData: "bad ix data",
        invalidAccount: "bad account",
    },
    computeUnitFloor: {
        conditionFailed: "cu too low",
        badInstructionData: "bad ix data",
        invalidAccount: "bad account",
    },
} as const

export type GuardName = keyof typeof GuardLogMessage

export type ParsedGuardError = {
    programId: string
    code: GuardExitCode
}

const PROGRAM_FAILED_RE =
    /Program (\w+) failed: custom program error: 0x([0-9a-fA-F]+)/

export function parseGuardError(logs: string[]): ParsedGuardError | null {
    for (const line of logs) {
        const m = line.match(PROGRAM_FAILED_RE)
        if (m) {
            const code = parseInt(m[2], 16)
            return { programId: m[1], code: code as GuardExitCode }
        }
    }
    return null
}
