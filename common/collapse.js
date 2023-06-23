/// <reference path="../csgo.d.ts" />
var Collapse = (function () {
    const _LogInternal = function (str) {
    };
    const _LogInternalEmpty = function (str) { };
    const _Log = _LogInternalEmpty;
    const _RegisterTransitionEndEventHandler = function (panel) {
        if (panel.Collapse_OnTransitionEndEvent === undefined) {
            panel.Collapse_OnTransitionEndEvent = function (panelName, propertyName) {
                if (panel.id === panelName && propertyName === 'height' && panel.BHasClass('Collapsing')) {
                    _Log('Collpase - End of transition');
                    panel.RemoveClass('Collapsing');
                    panel.style.height = null;
                    return true;
                }
                return false;
            };
            $.RegisterEventHandler('PropertyTransitionEnd', panel, panel.Collapse_OnTransitionEndEvent);
            _Log('Collpase transition end event registered');
        }
    };
    const _Show = function (panel, bIsStyleHeightFitChildren) {
        _Log('Collapse.Show ' + panel.id);
        _RegisterTransitionEndEventHandler(panel);
        panel.AddClass('Collapsing');
        if (bIsStyleHeightFitChildren) {
            panel.style.height = panel.contentheight + 'px';
        }
        panel.RemoveClass('Collapsed');
    };
    const _Hide = function (panel, bIsStyleHeightFitChildren) {
        _Log('Collapse.Hide ' + panel.id);
        _RegisterTransitionEndEventHandler(panel);
        if (panel.BHasClass('Collapsed')) {
            return;
        }
        if (bIsStyleHeightFitChildren) {
            panel.style.height = panel.contentheight + 'px';
        }
        panel.AddClass('Collapsing');
        panel.AddClass('Collapsed');
        if (bIsStyleHeightFitChildren) {
            panel.style.height = '0px';
        }
    };
    const _Toggle = function (panel, bIsStyleHeightFitChildren) {
        _Log('Collapse.Toggle ' + panel.id);
        if (panel.BHasClass('Collapsed')) {
            _Show(panel, bIsStyleHeightFitChildren);
        }
        else {
            _Hide(panel, bIsStyleHeightFitChildren);
        }
    };
    return {
        Show: _Show,
        Hide: _Hide,
        Toggle: _Toggle
    };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGFwc2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb2xsYXBzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxQ0FBcUM7QUFFckMsSUFBSSxRQUFRLEdBQUcsQ0FBRTtJQUdiLE1BQU0sWUFBWSxHQUFHLFVBQVcsR0FBVztJQUczQyxDQUFDLENBQUM7SUFDRixNQUFNLGlCQUFpQixHQUFHLFVBQVcsR0FBVyxJQUFXLENBQUMsQ0FBQztJQUU3RCxNQUFNLElBQUksR0FBRyxpQkFBaUIsQ0FBQztJQUkvQixNQUFNLGtDQUFrQyxHQUFHLFVBQVcsS0FBNkI7UUFFL0UsSUFBSyxLQUFLLENBQUMsNkJBQTZCLEtBQUssU0FBUyxFQUN0RDtZQUVJLEtBQUssQ0FBQyw2QkFBNkIsR0FBRyxVQUFXLFNBQVMsRUFBRSxZQUFZO2dCQUVwRSxJQUFLLEtBQUssQ0FBQyxFQUFFLEtBQUssU0FBUyxJQUFJLFlBQVksS0FBSyxRQUFRLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBRSxZQUFZLENBQUUsRUFDM0Y7b0JBQ0ksSUFBSSxDQUFFLDhCQUE4QixDQUFFLENBQUM7b0JBRXZDLEtBQUssQ0FBQyxXQUFXLENBQUUsWUFBWSxDQUFFLENBQUM7b0JBRWxDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztvQkFFMUIsT0FBTyxJQUFJLENBQUM7aUJBQ2Y7Z0JBQ0QsT0FBTyxLQUFLLENBQUM7WUFDakIsQ0FBQyxDQUFDO1lBR0YsQ0FBQyxDQUFDLG9CQUFvQixDQUFFLHVCQUF1QixFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsNkJBQTZCLENBQUUsQ0FBQztZQUM5RixJQUFJLENBQUUsMENBQTBDLENBQUUsQ0FBQztTQUN0RDtJQUNMLENBQUMsQ0FBQztJQUVGLE1BQU0sS0FBSyxHQUFHLFVBQVcsS0FBYyxFQUFFLHlCQUFrQztRQUV2RSxJQUFJLENBQUUsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBRSxDQUFDO1FBRXBDLGtDQUFrQyxDQUFFLEtBQUssQ0FBRSxDQUFDO1FBRzVDLEtBQUssQ0FBQyxRQUFRLENBQUUsWUFBWSxDQUFFLENBQUM7UUFFL0IsSUFBSyx5QkFBeUIsRUFDOUI7WUFLSSxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztTQUNuRDtRQUVELEtBQUssQ0FBQyxXQUFXLENBQUUsV0FBVyxDQUFFLENBQUM7SUFDckMsQ0FBQyxDQUFDO0lBRUYsTUFBTSxLQUFLLEdBQUcsVUFBVyxLQUFjLEVBQUUseUJBQWtDO1FBRXZFLElBQUksQ0FBRSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFFLENBQUM7UUFFcEMsa0NBQWtDLENBQUUsS0FBSyxDQUFFLENBQUM7UUFFNUMsSUFBSyxLQUFLLENBQUMsU0FBUyxDQUFFLFdBQVcsQ0FBRSxFQUNuQztZQUNJLE9BQU87U0FDVjtRQUVELElBQUsseUJBQXlCLEVBQzlCO1lBS0ksS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7U0FDbkQ7UUFHRCxLQUFLLENBQUMsUUFBUSxDQUFFLFlBQVksQ0FBRSxDQUFDO1FBQy9CLEtBQUssQ0FBQyxRQUFRLENBQUUsV0FBVyxDQUFFLENBQUM7UUFFOUIsSUFBSyx5QkFBeUIsRUFDOUI7WUFFSSxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7U0FDOUI7SUFDTCxDQUFDLENBQUM7SUFFRixNQUFNLE9BQU8sR0FBRyxVQUFXLEtBQWMsRUFBRSx5QkFBa0M7UUFFekUsSUFBSSxDQUFFLGtCQUFrQixHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUUsQ0FBQztRQUV0QyxJQUFLLEtBQUssQ0FBQyxTQUFTLENBQUUsV0FBVyxDQUFFLEVBQ25DO1lBQ0ksS0FBSyxDQUFFLEtBQUssRUFBRSx5QkFBeUIsQ0FBRSxDQUFDO1NBQzdDO2FBRUQ7WUFDSSxLQUFLLENBQUUsS0FBSyxFQUFFLHlCQUF5QixDQUFFLENBQUM7U0FDN0M7SUFDTCxDQUFDLENBQUM7SUFHRixPQUFPO1FBQ0gsSUFBSSxFQUFFLEtBQUs7UUFDWCxJQUFJLEVBQUUsS0FBSztRQUNYLE1BQU0sRUFBRSxPQUFPO0tBQ2xCLENBQUM7QUFFTixDQUFDLENBQUUsRUFBRSxDQUFDIn0=