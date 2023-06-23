/// <reference path="../csgo.d.ts" />
var FlipPanelAnimation = (function () {
    class FlipPanelAnimation {
        oData;
        get ActiveIndex() { return this.oData.activeIndex; }
        set ActiveIndex(value) { this.oData.activeIndex = value; }
        set CallbackData(value) { this.oData.oCallbackData = value; }
        constructor(oData) {
            this.oData = oData;
        }
        AddParamToCallbackData(param, value) {
            this.oData.oCallbackData[param] = value;
        }
        ;
        ControlBtnActions() {
            if (this.oData.controlBtnPrev) {
                this.oData.controlBtnPrev.SetPanelEvent('onactivate', this.oData.funcCallback.bind(this, this.oData, true));
                this.oData.controlBtnNext.SetPanelEvent('onactivate', this.oData.funcCallback.bind(this, this.oData, false));
                this.oData.controlBtnPrev.enabled = false;
                this.oData.controlBtnNext.enabled = false;
            }
        }
        ;
        UpdateTextLabel(elPanel, aTextData) {
            aTextData.forEach(element => {
                if (typeof element.value == 'number' && element.value > 0) {
                    elPanel.SetDialogVariableInt(element.name, element.value);
                }
                else if (element.value) {
                    elPanel.SetDialogVariable(element.name, element.value.toString());
                }
            });
        }
        ;
        UseCallback() {
            this.oData.funcCallback(this.oData, false);
        }
        ;
        DetermineVisiblePanel(animPanelA, animPanelB) {
            return animPanelA.BHasClass('flip-panel-anim-down-show') || animPanelA.BHasClass('flip-panel-anim-up-show') ? animPanelA : animPanelB;
        }
        ;
        BtnPressNextAnim(panelA, panelB) {
            const visiblePanel = this.DetermineVisiblePanel(panelA, panelB);
            const hiddenPanel = visiblePanel === panelA ? panelB : panelA;
            visiblePanel.RemoveClass('flip-panel-anim-transition');
            visiblePanel.RemoveClass('flip-panel-anim-up-hidden');
            visiblePanel.RemoveClass('flip-panel-anim-down-show');
            visiblePanel.RemoveClass('flip-panel-anim-up-show');
            visiblePanel.RemoveClass('flip-panel-anim-down-hidden');
            visiblePanel.AddClass('flip-panel-anim-transition');
            visiblePanel.AddClass('flip-panel-anim-down-hidden');
            hiddenPanel.RemoveClass('flip-panel-anim-transition');
            hiddenPanel.RemoveClass('flip-panel-anim-down-hidden');
            hiddenPanel.AddClass('flip-panel-anim-up-hidden');
            hiddenPanel.AddClass('flip-panel-anim-transition');
            hiddenPanel.AddClass('flip-panel-anim-down-show');
        }
        ;
        BtnPressPrevAnim(panelA, panelB) {
            const visiblePanel = this.DetermineVisiblePanel(panelA, panelB);
            const hiddenPanel = visiblePanel === panelA ? panelB : panelA;
            visiblePanel.RemoveClass('flip-panel-anim-transition');
            visiblePanel.RemoveClass('flip-panel-anim-up-hidden');
            visiblePanel.RemoveClass('flip-panel-anim-down-show');
            visiblePanel.RemoveClass('flip-panel-anim-up-show');
            visiblePanel.RemoveClass('flip-panel-anim-down-hidden');
            visiblePanel.AddClass('flip-panel-anim-transition');
            visiblePanel.AddClass('flip-panel-anim-up-hidden');
            hiddenPanel.RemoveClass('flip-panel-anim-transition');
            hiddenPanel.RemoveClass('flip-panel-anim-up-hidden');
            hiddenPanel.AddClass('flip-panel-anim-down-hidden');
            hiddenPanel.AddClass('flip-panel-anim-transition');
            hiddenPanel.AddClass('flip-panel-anim-up-show');
        }
        ;
        DetermineHiddenPanel(animPanelA, animPanelB) {
            return (!animPanelA.BHasClass('flip-panel-anim-down-show') &&
                !animPanelA.BHasClass('flip-panel-anim-up-show')) ?
                animPanelA : animPanelB;
        }
        ;
    }
    return {
        Constructor: FlipPanelAnimation
    };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxpcF9wYW5lbF9hbmltLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmxpcF9wYW5lbF9hbmltLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFDQUFxQztBQWdCckMsSUFBSSxrQkFBa0IsR0FBRyxDQUFFO0lBRTFCLE1BQU0sa0JBQWtCO1FBRXZCLEtBQUssQ0FBeUI7UUFFOUIsSUFBVyxXQUFXLEtBQU0sT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDNUQsSUFBVyxXQUFXLENBQUcsS0FBYSxJQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFFNUUsSUFBVyxZQUFZLENBQUcsS0FBa0MsSUFBSyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRXBHLFlBQWEsS0FBNkI7WUFFekMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDcEIsQ0FBQztRQUVELHNCQUFzQixDQUFHLEtBQXNCLEVBQUUsS0FBc0I7WUFFdEUsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUUsS0FBSyxDQUFFLEdBQUcsS0FBSyxDQUFDO1FBQzNDLENBQUM7UUFBQSxDQUFDO1FBRUYsaUJBQWlCO1lBRWhCLElBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQzlCO2dCQUNDLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFFLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBRSxDQUFFLENBQUM7Z0JBQ2hILElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFFLElBQUks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