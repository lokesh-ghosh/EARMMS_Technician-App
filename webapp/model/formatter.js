sap.ui.define([], () => {
    "use strict";

    return {
        slaStatusState(slaStatus) {
            return { Breached: "Error", AtRisk: "Warning", OnTrack: "Success" }[slaStatus] || "None";
        },

        severityState(severity) {
            return { High: "Error", Medium: "Warning", Low: "Success" }[severity] || "None";
        },

        statusState(status) {
            return {
                Open: "None", Assigned: "Information",
                InProgress: "Information", Resolved: "Success", Closed: "None"
            }[status] || "None";
        },

        slaIconSrc(slaStatus) {
            return {
                Breached: "sap-icon://error",
                AtRisk:   "sap-icon://warning2",
                OnTrack:  "sap-icon://status-positive"
            }[slaStatus] || "sap-icon://information";
        },

        slaIconColor(slaStatus) {
            return { Breached: "#C62828", AtRisk: "#E65100", OnTrack: "#107E3E" }[slaStatus] || "#6A6D70";
        },

        timeRemaining(expectedTimestamp, slaStatus) {
            if (!expectedTimestamp) return "";
            const diffMs = new Date(expectedTimestamp) - new Date();
            const abs    = Math.abs(diffMs);
            const h      = Math.floor(abs / 3600000);
            const m      = Math.floor((abs % 3600000) / 60000);
            if (slaStatus === "Breached" || diffMs <= 0) {
                return `Breached ${h}h ${m}m ago`;
            }
            if (h > 23) return `Due in ${Math.floor(h / 24)}d ${h % 24}h`;
            return `Due in ${h}h ${m}m`;
        },

        timeRemainingClass(slaStatus) {
            return "timeInfo " + ({ Breached: "timeBreached", AtRisk: "timeAtRisk", OnTrack: "timeOnTrack" }[slaStatus] || "timeOnTrack");
        },

        formatDate(timestamp) {
            if (!timestamp) return "–";
            return new Date(timestamp).toLocaleDateString("en-GB", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit"
            });
        },

        formatShortDate(timestamp) {
            if (!timestamp) return "–";
            return new Date(timestamp).toLocaleDateString("en-GB", {
                day: "2-digit", month: "short",
                hour: "2-digit", minute: "2-digit"
            });
        },

        statusDisplayText(status) {
            return { Open: "Open", Assigned: "Assigned", InProgress: "In Progress", Resolved: "Resolved", Closed: "Closed" }[status] || status;
        },

        isResolved(status) {
            return status === "Resolved" || status === "Closed";
        },

        isNotResolved(status) {
            return status !== "Resolved" && status !== "Closed";
        },

        vipVisible(isVIP) {
            return isVIP === true;
        }
    };
});
