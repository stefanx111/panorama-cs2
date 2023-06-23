/// <reference path="../csgo.d.ts" />
/// <reference path="../digitpanel.ts" />
var MoneyPanel = (function () {
    $.RegisterEventHandler('UpdateHudMoney', $.GetContextPanel(), _UpdateMoney);
    function _UpdateMoney(amt, bInstant = false) {
        const elContainer = $('#jsRotaryMoney');
        if (elContainer) {
            if (!$('#DigitPanel'))
                DigitPanelFactory.MakeDigitPanel(elContainer, 6, '', 0.6, "#digitpanel_digits_hudmoney");
            DigitPanelFactory.SetDigitPanelString(elContainer, '$' + amt, bInstant);
        }
    }
    return {
        UpdateMoney: _UpdateMoney,
    };
})();
(function () {
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHVkbW9uZXkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJodWRtb25leS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxQ0FBcUM7QUFDckMseUNBQXlDO0FBRXpDLElBQUksVUFBVSxHQUFHLENBQUU7SUFHbEIsQ0FBQyxDQUFDLG9CQUFvQixDQUFFLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxlQUFlLEVBQUUsRUFBRSxZQUFZLENBQUUsQ0FBQztJQUU5RSxTQUFTLFlBQVksQ0FBRyxHQUFXLEVBQUUsV0FBb0IsS0FBSztRQUU3RCxNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUUsZ0JBQWdCLENBQUUsQ0FBQztRQUUxQyxJQUFLLFdBQVcsRUFDaEI7WUFDQyxJQUFLLENBQUMsQ0FBQyxDQUFFLGFBQWEsQ0FBRTtnQkFDdkIsaUJBQWlCLENBQUMsY0FBYyxDQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSw2QkFBNkIsQ0FBRSxDQUFDO1lBRTVGLGlCQUFpQixDQUFDLG1CQUFtQixDQUFFLFdBQVcsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLFFBQVEsQ0FBRSxDQUFDO1NBRzFFO0lBRUYsQ0FBQztJQUdELE9BQU87UUFDTixXQUFXLEVBQUUsWUFBWTtLQUN6QixDQUFDO0FBRUgsQ0FBQyxDQUFFLEVBQUUsQ0FBQztBQUtOLENBQUU7QUFFRixDQUFDLENBQUUsRUFBRSxDQUFDIn0=