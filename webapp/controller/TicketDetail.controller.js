sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment"
], (BaseController, formatter, JSONModel, MessageToast, MessageBox, Fragment) => {
    "use strict";

    const STATUS_ORDER = ["Open", "Assigned", "InProgress", "Resolved", "Closed"];

    return BaseController.extend("com.wipro.earmms.technician.app.earmmstechnicianapp.controller.TicketDetail", {

        formatter,

        onInit() {
            this.setModel(new JSONModel({}), "detailModel");
            this.getRouter().getRoute("ticketDetail").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched(oEvent) {
            const sRequestId = oEvent.getParameter("arguments").requestId;
            this._loadTicket(sRequestId);
        },

        _loadTicket(sRequestId) {
            const oRepairModel = this.getOwnerComponent().getModel("repair");
            const aRequests = oRepairModel.getProperty("/repairRequests") || [];
            const oRequest = aRequests.find(r => r.requestId === sRequestId);

            if (!oRequest) {
                MessageToast.show("Ticket not found");
                this.onNavBack();
                return;
            }

            const oData = Object.assign({}, oRequest);
            oData.nextStatusOptions = this._getNextStatusOptions(oRequest.status);
            oData.statusProgressHtml = this._buildProgressHtml(oRequest.status);
            if (!oData.actualResolutionTimestamp) {
                oData.actualResolutionTimestamp = new Date().toISOString().substring(0, 19);
            }

            this.getModel("detailModel").setData(oData);
            this._applySlaCardStyle(oRequest.slaStatus);
        },

        _applySlaCardStyle(sSlaStatus) {
            const oCard = this.byId("slaHighCard");
            if (!oCard) return;
            const colorMap = {
                Breached: ["slaCardOnTrack", "slaCardAtRisk", "slaCardBreached"],
                AtRisk:   ["slaCardOnTrack", "slaCardBreached", "slaCardAtRisk"],
                OnTrack:  ["slaCardAtRisk",  "slaCardBreached", "slaCardOnTrack"]
            };
            const [remove1, remove2, add] = colorMap[sSlaStatus] || colorMap.OnTrack;
            oCard.removeStyleClass(remove1);
            oCard.removeStyleClass(remove2);
            oCard.addStyleClass(add);
        },

        _getNextStatusOptions(sCurrentStatus) {
            const flow = {
                Open:       [{ key: "Assigned",   text: "Assigned" }],
                Assigned:   [{ key: "InProgress",  text: "In Progress" }],
                InProgress: [{ key: "Resolved",    text: "Resolved" }],
                Resolved:   [{ key: "Closed",      text: "Closed" }]
            };
            return flow[sCurrentStatus] || [];
        },

        _buildProgressHtml(sCurrentStatus) {
            const steps = [
                { key: "Open",       label: "Open"       },
                { key: "Assigned",   label: "Assigned"   },
                { key: "InProgress", label: "In Prog."   },
                { key: "Resolved",   label: "Resolved"   },
                { key: "Closed",     label: "Closed"     }
            ];
            const currentIdx = STATUS_ORDER.indexOf(sCurrentStatus);
            let html = `<div style="display:flex;align-items:flex-start;padding:0 4px;">`;
            steps.forEach((step, idx) => {
                const isDone    = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                const lineColor = isDone ? "#2563eb" : "#e2e8f0";

                const dotBg    = isDone ? "#2563eb" : (isCurrent ? "#0f172a" : "#e2e8f0");
                const dotColor = (isDone || isCurrent) ? "#ffffff" : "#94a3b8";
                const dotShadow = isCurrent ? "0 0 0 4px rgba(37,99,235,0.20)" : "none";
                const labelColor = isDone ? "#2563eb" : (isCurrent ? "#0f172a" : "#94a3b8");
                const labelWeight = isCurrent ? "700" : "500";

                html += `<div style="flex:1;text-align:center;position:relative;">`;
                if (idx < steps.length - 1) {
                    html += `<div style="position:absolute;top:14px;left:50%;width:100%;height:2px;background:${lineColor};z-index:0;"></div>`;
                }
                html += `<div style="width:28px;height:28px;border-radius:50%;background:${dotBg};color:${dotColor};display:inline-flex;align-items:center;justify-content:center;position:relative;z-index:1;margin-bottom:4px;font-size:0.68rem;font-weight:700;box-shadow:${dotShadow};">`;
                html += isDone ? `✓` : `${idx + 1}`;
                html += `</div>`;
                html += `<div style="font-size:0.58rem;color:${labelColor};font-weight:${labelWeight};">${step.label}</div>`;
                html += `</div>`;
            });
            html += `</div>`;
            return html;
        },

        // ── Update Status Dialog ──────────────────────────────────────────────
        async onUpdateStatus() {
            if (!this._oUpdateStatusDialog) {
                this._oUpdateStatusDialog = await Fragment.load({
                    id: this.getView().getId(),
                    name: "com.wipro.earmms.technician.app.earmmstechnicianapp.view.fragments.UpdateStatusDialog",
                    controller: this
                });
                this.getView().addDependent(this._oUpdateStatusDialog);
            }
            this._oUpdateStatusDialog.open();
        },

        onConfirmStatusUpdate() {
            const sViewId = this.getView().getId();
            const oSelect = Fragment.byId(sViewId, "newStatusSelect");
            const sNewStatus = oSelect ? oSelect.getSelectedKey() : null;

            if (!sNewStatus) {
                MessageToast.show("Please select a new status");
                return;
            }

            this._commitStatusUpdate(sNewStatus);
            this._oUpdateStatusDialog.close();
        },

        onCancelStatusUpdate() {
            this._oUpdateStatusDialog.close();
        },

        _commitStatusUpdate(sNewStatus) {
            const oDetailModel = this.getModel("detailModel");
            const sRequestId = oDetailModel.getProperty("/requestId");

            oDetailModel.setProperty("/status", sNewStatus);
            oDetailModel.setProperty("/nextStatusOptions", this._getNextStatusOptions(sNewStatus));
            oDetailModel.setProperty("/statusProgressHtml", this._buildProgressHtml(sNewStatus));

            // Propagate to the shared repair model
            const oRepairModel = this.getOwnerComponent().getModel("repair");
            const aRequests = oRepairModel.getProperty("/repairRequests") || [];
            const idx = aRequests.findIndex(r => r.requestId === sRequestId);
            if (idx >= 0) {
                oRepairModel.setProperty(`/repairRequests/${idx}/status`, sNewStatus);
            }

            MessageToast.show(`Status updated → ${this.formatter.statusDisplayText(sNewStatus)}`);
        },

        // ── Resolve Dialog ────────────────────────────────────────────────────
        async onResolveTicket() {
            if (!this._oResolveDialog) {
                this._oResolveDialog = await Fragment.load({
                    id: this.getView().getId(),
                    name: "com.wipro.earmms.technician.app.earmmstechnicianapp.view.fragments.ResolveDialog",
                    controller: this
                });
                this.getView().addDependent(this._oResolveDialog);
            }
            const oInput = Fragment.byId(this.getView().getId(), "resolutionNotesInput");
            if (oInput) {
                oInput.setValue("");
                oInput.setValueState("None");
            }
            this._oResolveDialog.open();
        },

        onConfirmResolve() {
            const sViewId = this.getView().getId();
            const oInput  = Fragment.byId(sViewId, "resolutionNotesInput");
            const sNotes  = oInput ? oInput.getValue().trim() : "";

            if (!sNotes) {
                oInput && oInput.setValueState("Error");
                MessageToast.show("Resolution notes are required");
                return;
            }
            oInput && oInput.setValueState("None");

            const oDetailModel = this.getModel("detailModel");
            const sRequestId   = oDetailModel.getProperty("/requestId");
            const sRequestNum  = oDetailModel.getProperty("/requestNumber");
            const sTimestamp   = new Date().toISOString().substring(0, 19);

            oDetailModel.setProperty("/status", "Resolved");
            oDetailModel.setProperty("/resolutionNotes", sNotes);
            oDetailModel.setProperty("/actualResolutionTimestamp", sTimestamp);
            oDetailModel.setProperty("/statusProgressHtml", this._buildProgressHtml("Resolved"));
            oDetailModel.setProperty("/nextStatusOptions", this._getNextStatusOptions("Resolved"));
            this._applySlaCardStyle(oDetailModel.getProperty("/slaStatus"));

            // Propagate to shared model
            const oRepairModel = this.getOwnerComponent().getModel("repair");
            const aRequests = oRepairModel.getProperty("/repairRequests") || [];
            const idx = aRequests.findIndex(r => r.requestId === sRequestId);
            if (idx >= 0) {
                oRepairModel.setProperty(`/repairRequests/${idx}/status`, "Resolved");
                oRepairModel.setProperty(`/repairRequests/${idx}/resolutionNotes`, sNotes);
                oRepairModel.setProperty(`/repairRequests/${idx}/actualResolutionTimestamp`, sTimestamp);
            }

            this._oResolveDialog.close();
            MessageBox.success(`Ticket ${sRequestNum} has been resolved!`, {
                actions: [MessageBox.Action.OK],
                onClose: () => this.onNavBack()
            });
        },

        onCancelResolve() {
            this._oResolveDialog.close();
        }
    });
});
