import { describe, expect, test } from "bun:test"
import {
    GuardExitCode,
    GuardLogMessage,
    parseGuardError,
} from "../src/errors"

describe("GuardExitCode", () => {
    test("matches the on-chain exit codes", () => {
        expect(GuardExitCode.Success).toBe(0)
        expect(GuardExitCode.ConditionFailed).toBe(1)
        expect(GuardExitCode.BadInstructionData).toBe(2)
        expect(GuardExitCode.InvalidAccount).toBe(3)
    })
})

describe("GuardLogMessage", () => {
    test("matches the strings each guard logs on failure", () => {
        // These must stay in sync with src/*/*.s msg_* labels.
        expect(GuardLogMessage.slotDeadline.conditionFailed).toBe(
            "deadline missed"
        )
        expect(GuardLogMessage.slippage.conditionFailed).toBe("insufficient")
        expect(GuardLogMessage.balanceFloor.conditionFailed).toBe("below floor")
        expect(GuardLogMessage.feeCeiling.conditionFailed).toBe("fee too high")
        expect(GuardLogMessage.feeCeiling.invalidAccount).toBe("bad account")
        expect(GuardLogMessage.slotDeadline.badInstructionData).toBe(
            "bad ix data"
        )
    })
})

describe("parseGuardError", () => {
    test("parses condition-failed (exit 1)", () => {
        const logs = [
            "Program ShieldXyz111111111111111111111111111111111 invoke [1]",
            "Program log: insufficient",
            "Program ShieldXyz111111111111111111111111111111111 failed: custom program error: 0x1",
        ]
        const parsed = parseGuardError(logs)
        expect(parsed).not.toBeNull()
        expect(parsed!.code).toBe(GuardExitCode.ConditionFailed)
        expect(parsed!.programId).toBe("ShieldXyz111111111111111111111111111111111")
    })

    test("parses bad-instruction-data (exit 2)", () => {
        const logs = [
            "Program log: bad ix data",
            "Program ShieldXyz111111111111111111111111111111111 failed: custom program error: 0x2",
        ]
        const parsed = parseGuardError(logs)
        expect(parsed!.code).toBe(GuardExitCode.BadInstructionData)
    })

    test("returns null when no failure line is present", () => {
        const logs = [
            "Program log: all good",
            "Program ShieldXyz111111111111111111111111111111111 success",
        ]
        expect(parseGuardError(logs)).toBeNull()
    })

    test("returns null on empty logs", () => {
        expect(parseGuardError([])).toBeNull()
    })

    test("returns first failure when multiple are present", () => {
        const logs = [
            "Program AAAA1111111111111111111111111111111111111111 failed: custom program error: 0x1",
            "Program BBBB1111111111111111111111111111111111111111 failed: custom program error: 0x2",
        ]
        const parsed = parseGuardError(logs)
        expect(parsed!.programId).toBe("AAAA1111111111111111111111111111111111111111")
        expect(parsed!.code).toBe(GuardExitCode.ConditionFailed)
    })
})
