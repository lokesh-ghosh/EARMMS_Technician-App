sap.ui.define([
    "./BaseController",
    "../model/formatter",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], (BaseController, formatter, JSONModel, MessageToast) => {
    "use strict";

    return BaseController.extend("com.wipro.earmms.technician.app.earmmstechnicianapp.controller.WorkQueue", {

        formatter,

        onInit() {
            this._sCurrentFilter = "All";
            this._sSearchText = "";

            this.setModel(new JSONModel({ busy: false, filteredRequests: [], kpiHtml: "" }), "viewModel");
            this.getRouter().getRoute("workQueue").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched() {
            this._loadData();
        },

        _loadData() {
            const oRepairModel   = this.getOwnerComponent().getModel("repair");
            const oTechModel     = this.getOwnerComponent().getModel("technician");
            if (!oRepairModel || !oTechModel) return;

            // ── Filter to the logged-in technician's own tickets ──────────────
            const sTechId    = oTechModel.getProperty("/technicianId");
            const aAllRequests = oRepairModel.getProperty("/repairRequests") || [];
            const aMyRequests  = aAllRequests.filter(
                r => r.assignedTechnician_technicianId === sTechId
            );

            this._allMyRequests = this._sortBySla(aMyRequests);

            // Recompute stats from this technician's own tickets only
            const oStats = this._computeStats(this._allMyRequests);
            oTechModel.setProperty("/stats", oStats);

            this._applyFilter();
            this._buildKpiHtml(oStats, oTechModel.getProperty("/name"));
        },

        _computeStats(aRequests) {
            return {
                total:    aRequests.length,
                onTrack:  aRequests.filter(r => r.slaStatus === "OnTrack"  && r.status !== "Resolved" && r.status !== "Closed").length,
                atRisk:   aRequests.filter(r => r.slaStatus === "AtRisk"   && r.status !== "Resolved" && r.status !== "Closed").length,
                breached: aRequests.filter(r => r.slaStatus === "Breached" && r.status !== "Resolved" && r.status !== "Closed").length,
                resolved: aRequests.filter(r => r.status === "Resolved" || r.status === "Closed").length
            };
        },

        _sortBySla(aRequests) {
            const order = { Breached: 0, AtRisk: 1, OnTrack: 2 };
            return [...aRequests].sort((a, b) => {
                const diff = (order[a.slaStatus] ?? 3) - (order[b.slaStatus] ?? 3);
                if (diff !== 0) return diff;
                return new Date(a.expectedResolutionTimestamp) - new Date(b.expectedResolutionTimestamp);
            });
        },

        _applyFilter() {
            let aFiltered = [...(this._allMyRequests || [])];

            if (this._sCurrentFilter && this._sCurrentFilter !== "All") {
                aFiltered = aFiltered.filter(r => r.slaStatus === this._sCurrentFilter);
            }

            if (this._sSearchText) {
                const q = this._sSearchText.toLowerCase();
                aFiltered = aFiltered.filter(r =>
                    [r.requestNumber, r.asset?.assetTag, r.issueDescription,
                     r.raisedBy?.name, r.issueCategory]
                        .some(v => v && v.toLowerCase().includes(q))
                );
            }

            this.getModel("viewModel").setProperty("/filteredRequests", aFiltered);
        },

        _buildKpiHtml(oStats, sTechName) {
            const html = `
                <div class="summaryStrip">
                    <div class="kpiCard">
                        <span class="kpiNumber">${oStats.total}</span>
                        <span class="kpiLabel">My Tickets</span>
                    </div>
                    <div class="kpiCard kpiAtRisk">
                        <span class="kpiNumber">${oStats.atRisk}</span>
                        <span class="kpiLabel">At Risk</span>
                    </div>
                    <div class="kpiCard kpiBreached">
                        <span class="kpiNumber">${oStats.breached}</span>
                        <span class="kpiLabel">Breached</span>
                    </div>
                    <div class="kpiCard">
                        <span class="kpiNumber">${oStats.resolved}</span>
                        <span class="kpiLabel">Resolved</span>
                    </div>
                </div>`;
            this.getModel("viewModel").setProperty("/kpiHtml", html);
        },

        onFilterSelect(oEvent) {
            this._sCurrentFilter = oEvent.getParameter("key");
            this._applyFilter();
        },

        onSearch(oEvent) {
            this._sSearchText = oEvent.getParameter("newValue") || oEvent.getParameter("query") || "";
            this._applyFilter();
        },

        onRefresh() {
            const oViewModel = this.getModel("viewModel");
            oViewModel.setProperty("/busy", true);
            setTimeout(() => {
                this._loadData();
                oViewModel.setProperty("/busy", false);
                MessageToast.show("Queue refreshed");
            }, 600);
        },

        onTicketPress(oEvent) {
            const oRequest = oEvent.getSource().getBindingContext("viewModel").getObject();
            this.getRouter().navTo("ticketDetail", { requestId: oRequest.requestId });
        },

        onProfilePress() {
            const oTech = this.getOwnerComponent().getModel("technician").getData();
            MessageToast.show(`${oTech.name} · ${oTech.specialization} Specialist`);
        }
    });
});
