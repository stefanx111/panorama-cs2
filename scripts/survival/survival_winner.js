/// <reference path="../csgo.d.ts" />
var SurvivalWinner = (function () {
    const _ShowPanel = function (numType) {
        if (numType !== 21 && numType !== 22) {
            return;
        }
        const elParent = $.GetContextPanel();
        const videoPlayer = elParent.FindChildInLayoutFile('id-survival-movie');
        videoPlayer.SetMovie("file://{resources}/videos/survival_winner.webm");
        videoPlayer.Play();
        videoPlayer.AddClass('survival-winner__movie--fadeout');
        $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.gameover_show', 'MOUSE');
        $.Schedule(0.4, function () {
            $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.XP.NewSkillGroup', 'MOUSE');
            $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.inventory_new_item_accept', 'MOUSE');
        });
        elParent.FindChildInLayoutFile('id-survival-winner').TriggerClass('survival-winner--reveal');
        elParent.FindChildInLayoutFile('id-survivor_winner-ring').TriggerClass('survival-winner__ring--flash');
        elParent.FindChildInLayoutFile('id-survival-avatar-container').TriggerClass('reveal');
    };
    return {
        ShowPanel: _ShowPanel
    };
})();
(function () {
    $.RegisterEventHandler("HudWinPanel_Show", $.GetContextPanel(), SurvivalWinner.ShowPanel);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3Vydml2YWxfd2lubmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3Vydml2YWxfd2lubmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFDQUFxQztBQVFyQyxJQUFJLGNBQWMsR0FBRyxDQUFFO0lBRW5CLE1BQU0sVUFBVSxHQUFHLFVBQVcsT0FBZTtRQUV6QyxJQUFLLE9BQU8sS0FBSyxFQUFFLElBQUksT0FBTyxLQUFLLEVBQUUsRUFDckM7WUFDSSxPQUFPO1NBQ1Y7UUFFRCxNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7UUFHckMsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLHFCQUFxQixDQUFFLG1CQUFtQixDQUFhLENBQUM7UUFDckYsV0FBVyxDQUFDLFFBQVEsQ0FBRSxnREFBZ0QsQ0FBRSxDQUFDO1FBQ3pFLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUVuQixXQUFXLENBQUMsUUFBUSxDQUFFLGlDQUFpQyxDQUFFLENBQUM7UUFLMUQsQ0FBQyxDQUFDLGFBQWEsQ0FBRSxxQkFBcUIsRUFBRSwwQkFBMEIsRUFBRSxPQUFPLENBQUUsQ0FBQztRQUU5RSxDQUFDLENBQUMsUUFBUSxDQUFFLEdBQUcsRUFBRTtZQUViLENBQUMsQ0FBQyxhQUFhLENBQUUscUJBQXFCLEVBQUUsNkJBQTZCLEVBQUUsT0FBTyxDQUFFLENBQUM7WUFDakYsQ0FBQyxDQUFDLGFBQWEsQ0FBRSxxQkFBcUIsRUFBRSxzQ0FBc0MsRUFBRSxPQUFPLENBQUUsQ0FBQztRQUM5RixDQUFDLENBQUUsQ0FBQztRQUVKLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBRSxvQkFBb0IsQ0FBRSxDQUFDLFlBQVksQ0FBRSx5QkFBeUIsQ0FBRSxDQUFDO1FBQ2pHLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBRSx5QkFBeUIsQ0FBRSxDQUFDLFlBQVksQ0FBRSw4QkFBOEIsQ0FBRSxDQUFDO1FBQzNHLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBRSw4QkFBOEIsQ0FBRSxDQUFDLFlBQVksQ0FBRSxRQUFRLENBQUUsQ0FBQztJQUU5RixDQUFDLENBQUM7SUFFRixPQUFPO1FBQ0gsU0FBUyxFQUFFLFVBQVU7S0FDeEIsQ0FBQztBQUVOLENBQUMsQ0FBRSxFQUFFLENBQUM7QUFLTixDQUFFO0lBRUUsQ0FBQyxDQUFDLG9CQUFvQixDQUFFLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxlQUFlLEVBQUUsRUFBRSxjQUFjLENBQUMsU0FBUyxDQUFFLENBQUM7QUFDaEcsQ0FBQyxDQUFFLEVBQUUsQ0FBQyJ9