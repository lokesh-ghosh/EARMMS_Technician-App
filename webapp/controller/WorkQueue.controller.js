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

            const oViewModel = new JSONModel({
                busy: false,
                filteredRequests: [],
                kpiHtml: ""
            });
            this.setModel(oViewModel, "viewModel");

            this.getRouter().getRoute("workQueue").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched() {
            this._loadData();
        },

        _loadData() {
            const oRepairModel = this.getOwnerComponent().getModel("repair");
            const oTechModel = this.getOwnerComponent().getModel("technician");

            if (!oRepairModel) return;

            const aRequests = oRepairModel.getProperty("/repairRequests") || [];
            this._allRequests = this._sortBySla(aRequests);
            this._applyFilter();
            this._buildKpiHtml(oTechModel.getProperty("/stats"));
        },

        _sortBySla(aRequests) {
            const order = { Breached: 0, AtRisk: 1, OnTrack: 2 };
            return [...aRequests].sort((a, b) => {
                const slaA = order[a.slaStatus] ?? 3;
                const slaB = order[b.slaStatus] ?? 3;
                if (slaA !== slaB) return slaA - slaB;
                return new Date(a.expectedResolutionTimestamp) - new Date(b.expectedResolutionTimestamp);
            });
        },

        _applyFilter() {
            const oViewModel = this.getModel("viewModel");
            let aFiltered = [...(this._allRequests || [])];

            if (this._sCurrentFilter && this._sCurrentFilter !== "All") {
                aFiltered = aFiltered.filter(r => r.slaStatus === this._sCurrentFilter);
            }

            if (this._sSearchText) {
                const sQuery = this._sSearchText.toLowerCase();
                aFiltered = aFiltered.filter(r =>
                    (r.requestNumber && r.requestNumber.toLowerCase().includes(sQuery)) ||
                    (r.asset && r.asset.assetTag && r.asset.assetTag.toLowerCase().includes(sQuery)) ||
                    (r.issueDescription && r.issueDescription.toLowerCase().includes(sQuery)) ||
                    (r.raisedBy && r.raisedBy.name && r.raisedBy.name.toLowerCase().includes(sQuery)) ||
                    (r.issueCategory && r.issueCategory.toLowerCase().includes(sQuery))
                );
            }

            oViewModel.setProperty("/filteredRequests", aFiltered);
        },

        _buildKpiHtml(oStats) {
            if (!oStats) return;
            const html = `
                <div class="summaryStrip">
                    <div class="kpiCard">
                        <span class="kpiNumber">${oStats.total}</span>
                        <span class="kpiLabel">Total</span>
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
                        <span class="kpiNumber">${oStats.resolved || 0}</span>
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
            const oCtx = oEvent.getSource().getBindingContext("viewModel");
            if (!oCtx) return;
            const oRequest = oCtx.getObject();
            this.getRouter().navTo("ticketDetail", { requestId: oRequest.requestId });
        },

        onProfilePress() {
            const oTech = this.getOwnerComponent().getModel("technician").getData();
            MessageToast.show(`${oTech.name} · ${oTech.specialization} Specialist`);
        }
    });
});
