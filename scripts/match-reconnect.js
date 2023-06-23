/// <reference path="csgo.d.ts" />
var MatchmakingReconnect;
(function (MatchmakingReconnect) {
    const m_elOngoingMatch = $.GetContextPanel();
    let m_bAcceptIsShowing = false;
    let m_bOngoingMatchHasEnded = false;
    function Init() {
        const btnReconnect = m_elOngoingMatch.FindChildInLayoutFile('MatchmakingReconnect');
        btnReconnect.SetPanelEvent('onactivate', function () {
            CompetitiveMatchAPI.ActionReconnectToOngoingMatch();
            $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.generic_button_press', 'MOUSE');
            UpdateState();
        });
        const btnAbandon = m_elOngoingMatch.FindChildInLayoutFile('MatchmakingAbandon');
        btnAbandon.SetPanelEvent('onactivate', function () {
            CompetitiveMatchAPI.ActionAbandonOngoingMatch();
            $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.generic_button_press', 'MOUSE');
            UpdateState();
        });
        const btnCancel = m_elOngoingMatch.FindChildInLayoutFile('MatchmakingCancel');
        btnCancel.SetPanelEvent('onactivate', function () {
            LobbyAPI.StopMatchmaking();
            $.DispatchEvent('CSGOPlaySoundEffect', 'UIPanorama.generic_button_press', 'MOUSE');
            UpdateState();
        });
        UpdateState();
    }
    MatchmakingReconnect.Init = Init;
    function UpdateState() {
        const bHasOngoingMatch = CompetitiveMatchAPI.HasOngoingMatch();
        if (!bHasOngoingMatch) {
            m_bOngoingMatchHasEnded = false;
        }
        const bCanReconnect = bHasOngoingMatch && !m_bOngoingMatchHasEnded;
        const sessionSettings = LobbyAPI.GetSessionSettings();
        const bIsReconnecting = sessionSettings?.game?.mapgroupname === "reconnect";
        m_elOngoingMatch.SetHasClass('show-actions', bCanReconnect && !bIsReconnecting && !m_bAcceptIsShowing);
        m_elOngoingMatch.SetHasClass('show-cancel', bCanReconnect && bIsReconnecting && !m_bAcceptIsShowing);
    }
    MatchmakingReconnect.UpdateState = UpdateState;
    function ReadyUpForMatch(shouldShow) {
        m_bAcceptIsShowing = shouldShow;
        UpdateState();
    }
    MatchmakingReconnect.ReadyUpForMatch = ReadyUpForMatch;
    function OnGamePhaseChange(nGamePhase) {
        m_bOngoingMatchHasEnded = nGamePhase === 5;
        UpdateState();
    }
    MatchmakingReconnect.OnGamePhaseChange = OnGamePhaseChange;
    function OnSidebarIsCollapsed(bIsCollapsed) {
        m_elOngoingMatch.SetHasClass('sidebar-collapsed', bIsCollapsed);
    }
    MatchmakingReconnect.OnSidebarIsCollapsed = OnSidebarIsCollapsed;
})(MatchmakingReconnect || (MatchmakingReconnect = {}));
(function () {
    MatchmakingReconnect.Init();
    $.RegisterForUnhandledEvent("PanoramaComponent_Lobby_MatchmakingSessionUpdate", MatchmakingReconnect.UpdateState);
    $.RegisterForUnhandledEvent('PanoramaComponent_GC_Hello', MatchmakingReconnect.UpdateState);
    $.RegisterForUnhandledEvent('PanoramaComponent_Lobby_ReadyUpForMatch', MatchmakingReconnect.ReadyUpForMatch);
    $.RegisterForUnhandledEvent('GameState_OnGamePhaseChange', MatchmakingReconnect.OnGamePhaseChange);
    $.RegisterForUnhandledEvent('SidebarIsCollapsed', MatchmakingReconnect.OnSidebarIsCollapsed);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWF0Y2gtcmVjb25uZWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWF0Y2gtcmVjb25uZWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLGtDQUFrQztBQUVsQyxJQUFVLG9CQUFvQixDQW1FN0I7QUFuRUQsV0FBVSxvQkFBb0I7SUFFN0IsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDN0MsSUFBSSxrQkFBa0IsR0FBRyxLQUFLLENBQUM7SUFDL0IsSUFBSSx1QkFBdUIsR0FBRyxLQUFLLENBQUM7SUFFcEMsU0FBZ0IsSUFBSTtRQUVuQixNQUFNLFlBQVksR0FBRyxnQkFBZ0IsQ0FBQyxxQkFBcUIsQ0FBRSxzQkFBc0IsQ0FBRSxDQUFDO1FBQ3RGLFlBQVksQ0FBQyxhQUFhLENBQUUsWUFBWSxFQUFFO1lBRXpDLG1CQUFtQixDQUFDLDZCQUE2QixFQUFFLENBQUM7WUFDcEQsQ0FBQyxDQUFDLGFBQWEsQ0FBRSxxQkFBcUIsRUFBRSxpQ0FBaUMsRUFBRSxPQUFPLENBQUUsQ0FBQztZQUNyRixXQUFXLEVBQUUsQ0FBQztRQUNmLENBQUMsQ0FBRSxDQUFDO1FBRUosTUFBTSxVQUFVLEdBQUcsZ0JBQWdCLENBQUMscUJBQXFCLENBQUUsb0JBQW9CLENBQUUsQ0FBQztRQUNsRixVQUFVLENBQUMsYUFBYSxDQUFFLFlBQVksRUFBRTtZQUV2QyxtQkFBbUIsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO1lBQ2hELENBQUMsQ0FBQyxhQUFhLENBQUUscUJBQXFCLEVBQUUsaUNBQWlDLEVBQUUsT0FBTyxDQUFFLENBQUM7WUFDckYsV0FBVyxFQUFFLENBQUM7UUFDZixDQUFDLENBQUUsQ0FBQztRQUVKLE1BQU0sU0FBUyxHQUFHLGdCQUFnQixDQUFDLHFCQUFxQixDQUFFLG1CQUFtQixDQUFFLENBQUM7UUFDaEYsU0FBUyxDQUFDLGFBQWEsQ0FBRSxZQUFZLEVBQUU7WUFFdEMsUUFBUSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzNCLENBQUMsQ0FBQyxhQUFhLENBQUUscUJBQXFCLEVBQUUsaUNBQWlDLEVBQUUsT0FBTyxDQUFFLENBQUM7WUFDckYsV0FBVyxFQUFFLENBQUM7UUFDZixDQUFDLENBQUUsQ0FBQztRQUVKLFdBQVcsRUFBRSxDQUFDO0lBQ2YsQ0FBQztJQTNCZSx5QkFBSSxPQTJCbkIsQ0FBQTtJQUVELFNBQWdCLFdBQVc7UUFFMUIsTUFBTSxnQkFBZ0IsR0FBRyxtQkFBbUIsQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUMvRCxJQUFLLENBQUMsZ0JBQWdCLEVBQ3RCO1lBQ0MsdUJBQXVCLEdBQUcsS0FBSyxDQUFDO1NBQ2hDO1FBQ0QsTUFBTSxhQUFhLEdBQUcsZ0JBQWdCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQztRQUVuRSxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsa0JBQWtCLEVBQVMsQ0FBQztRQUM3RCxNQUFNLGVBQWUsR0FBRyxlQUFlLEVBQUUsSUFBSSxFQUFFLFlBQVksS0FBSyxXQUFXLENBQUM7UUFFNUUsZ0JBQWdCLENBQUMsV0FBVyxDQUFFLGNBQWMsRUFBRSxhQUFhLElBQUksQ0FBQyxlQUFlLElBQUksQ0FBQyxrQkFBa0IsQ0FBRSxDQUFDO1FBQ3pHLGdCQUFnQixDQUFDLFdBQVcsQ0FBRSxhQUFhLEVBQUUsYUFBYSxJQUFJLGVBQWUsSUFBSSxDQUFDLGtCQUFrQixDQUFFLENBQUM7SUFDeEcsQ0FBQztJQWRlLGdDQUFXLGNBYzFCLENBQUE7SUFFRCxTQUFnQixlQUFlLENBQUcsVUFBbUI7UUFFcEQsa0JBQWtCLEdBQUcsVUFBVSxDQUFDO1FBQ2hDLFdBQVcsRUFBRSxDQUFDO0lBQ2YsQ0FBQztJQUplLG9DQUFlLGtCQUk5QixDQUFBO0lBRUQsU0FBZ0IsaUJBQWlCLENBQUcsVUFBa0I7UUFFckQsdUJBQXVCLEdBQUcsVUFBVSxLQUFLLENBQUMsQ0FBQztRQUMzQyxXQUFXLEVBQUUsQ0FBQztJQUNmLENBQUM7SUFKZSxzQ0FBaUIsb0JBSWhDLENBQUE7SUFFRCxTQUFnQixvQkFBb0IsQ0FBRyxZQUFxQjtRQUUzRCxnQkFBZ0IsQ0FBQyxXQUFXLENBQUUsbUJBQW1CLEVBQUUsWUFBWSxDQUFFLENBQUM7SUFDbkUsQ0FBQztJQUhlLHlDQUFvQix1QkFHbkMsQ0FBQTtBQUNGLENBQUMsRUFuRVMsb0JBQW9CLEtBQXBCLG9CQUFvQixRQW1FN0I7QUFFRCxDQUFFO0lBRUQsb0JBQW9CLENBQUMsSUFBSSxFQUFFLENBQUM7SUFFNUIsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLGtEQUFrRCxFQUFFLG9CQUFvQixDQUFDLFdBQVcsQ0FBRSxDQUFDO0lBR3BILENBQUMsQ0FBQyx5QkFBeUIsQ0FBRSw0QkFBNEIsRUFBRSxvQkFBb0IsQ0FBQyxXQUFXLENBQUUsQ0FBQztJQUU5RixDQUFDLENBQUMseUJBQXlCLENBQUUseUNBQXlDLEVBQUUsb0JBQW9CLENBQUMsZUFBZSxDQUFFLENBQUM7SUFDL0csQ0FBQyxDQUFDLHlCQUF5QixDQUFFLDZCQUE2QixFQUFFLG9CQUFvQixDQUFDLGlCQUFpQixDQUFFLENBQUM7SUFDckcsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLG9CQUFvQixFQUFFLG9CQUFvQixDQUFDLG9CQUFvQixDQUFFLENBQUM7QUFDaEcsQ0FBQyxDQUFFLEVBQUUsQ0FBQyJ9