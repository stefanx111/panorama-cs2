/// <reference path="csgo.d.ts" />
/// <reference path="common/iteminfo.ts" />
var controlsLibActiveTab = null;
function ControlsLibNavigateToTab(tab, msg) {
    if (controlsLibActiveTab) {
        controlsLibActiveTab.RemoveClass('Active');
    }
    controlsLibActiveTab = $('#' + tab);
    if (controlsLibActiveTab) {
        controlsLibActiveTab.AddClass('Active');
    }
}
function CloseControlsLib() {
    $.GetContextPanel().DeleteAsync(.3);
    var controlsLibPanel = $.GetContextPanel();
    controlsLibPanel.RemoveClass("Active");
}
function OpenControlsLib() {
    var controlsLibPanel = $.GetContextPanel();
    controlsLibPanel.AddClass("Active");
}
var jsPopupCallbackHandle = null;
var jsPopupLoadingBarCallbackHandle = null;
var popupLoadingBarLevel = 0;
function ClearPopupsText() {
    $('#ControlsLibPopupsText').text = '--';
}
function OnControlsLibPopupEvent(msg) {
    $('#ControlsLibPopupsText').text = msg;
}
function OnPopupCustomLayoutParamsPressed() {
    ClearPopupsText();
    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_custom_layout_test.xml', 'popupvalue=123456&callback=' + jsPopupCallbackHandle);
}
function OnPopupCustomLayoutImagePressed() {
    ClearPopupsText();
    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_custom_layout_test_image.xml', 'message=Example of popup with an image&image=file://{images}/control_icons/home_icon.vtf&callback=' + jsPopupCallbackHandle);
}
function OnPopupCustomLayoutImageSpinnerPressed() {
    ClearPopupsText();
    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_custom_layout_test_image.xml', 'message=Example of popup with an image and a spinner&image=file://{images}/control_icons/home_icon.vtf&spinner=1&callback=' + jsPopupCallbackHandle);
}
function OnPopupCustomLayoutImageLoadingPressed() {
    ClearPopupsText();
    popupLoadingBarLevel = 0;
    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_custom_layout_test_image.xml', 'message=Example of popup with an image and a loading bar&image=file://{images}/control_icons/home_icon.vtf&callback=' + jsPopupCallbackHandle + '&loadingBarCallback=' + jsPopupLoadingBarCallbackHandle);
}
function OnPopupCustomLayoutMatchAccept() {
    ClearPopupsText();
    popupLoadingBarLevel = 0;
    var popup = UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_accept_match.xml', 'map_and_isreconnect=de_dust2,false');
    $.DispatchEvent("ShowAcceptPopup", popup);
}
function OnPopupCustomLayoutWeaponUpdate() {
    ClearPopupsText();
    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_weapon_update.xml', "23");
}
function OnPopupCustomLayoutPremierPickBan() {
    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_premier_pick_ban.xml', "none");
}
function OnPopupCustomLayoutOpFull() {
    ClearPopupsText();
    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_operation_launch.xml', 'none');
}
function OnPopupCustomLayoutSurvivalEndOfMatch() {
    var elPanel = UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/survival/survival_endofmatch.xml', 'usefakedata=true');
}
function OnPopupCustomLayoutXpGrant() {
    UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/popups/popup_acknowledge_xpgrant.xml', 'none');
}
function OnPopupCustomLayoutOperationHub(startPage) {
    var nActiveSeason = GameTypesAPI.GetActiveSeasionIndexValue();
    if (nActiveSeason < 0)
        return;
    var elPanel = UiToolkitAPI.ShowCustomLayoutPopupParameters('', 'file://{resources}/layout/operation/operation_main.xml', 'none');
    elPanel.SetAttributeInt("season_access", nActiveSeason);
    if (startPage)
        elPanel.SetAttributeInt("start_page", startPage);
}
function OnPopupCustomLayoutLoadingScreen() {
    ClearPopupsText();
    UiToolkitAPI.ShowCustomLayoutPopup('teams', 'file://{resources}/layout/teamselectmenu.xml');
}
function OnControlsLibPopupLoadingBarEvent() {
    popupLoadingBarLevel += 0.05;
    if (popupLoadingBarLevel > 1.0) {
        popupLoadingBarLevel = 1.0;
    }
}
var jsContextMenuCallbackHandle = null;
function ClearContextMenuText() {
    $('#ControlsLibContextMenuText').text = '--';
}
function OnControlsLibContextMenuEvent(msg) {
    $('#ControlsLibContextMenuText').text = msg;
}
function OnSimpleContextMenu() {
    ClearContextMenuText();
    var items = [];
    items.push({ label: 'Item 1', jsCallback: function () { OnControlsLibContextMenuEvent('Item1'); } });
    items.push({ label: 'Item 2', jsCallback: function () { OnControlsLibContextMenuEvent('Item2'); } });
    items.push({ label: 'Item 3', jsCallback: function () { OnControlsLibContextMenuEvent('Item3'); } });
    UiToolkitAPI.ShowSimpleContextMenu('', 'ControlLibSimpleContextMenu', items);
}
function OnContextMenuCustomLayoutParamsPressed() {
    ClearContextMenuText();
    UiToolkitAPI.ShowCustomLayoutContextMenuParameters('', '', 'file://{resources}/layout/context_menus/context_menu_custom_layout_test.xml', 'test=123456&callback=' + jsContextMenuCallbackHandle);
}
var g_VideoNumTrailers = 2;
var g_VideoCurrentTrailer = 0;
function VideoPlayNextTrailer() {
    g_VideoCurrentTrailer = (g_VideoCurrentTrailer + 1) % g_VideoNumTrailers;
    var videoPlayer = $('#VideoTrailerPlayer');
    videoPlayer.SetMovie("file://{resources}/videos/trailer_" + g_VideoCurrentTrailer + ".webm");
    videoPlayer.SetTitle("Trailer " + g_VideoCurrentTrailer);
    videoPlayer.Play();
}
var g_sceneanimsList = [
    'cu_ct_pose01',
    'cu_ct_pose02',
    'cu_ct_pose03',
    'cu_ct_pose04',
    'cu_t_pose01',
    'cu_t_pose02',
    'cu_t_pose03',
    'cu_t_pose04',
];
var g_sceneanimindex = 0;
var g_maxsceneitemcontext = 5;
var g_sceneitemcontext = 0;
function InitScenePanel() {
    g_sceneanimindex = 0;
    var charT = LoadoutAPI.GetItemID('ct', 'customplayer');
    var model = ItemInfo.GetModelPlayer(charT);
    var playerPanel = $("#Player1");
    playerPanel.SetSceneAngles(0, 0, 0, false);
    playerPanel.SetPlayerModel(model);
    playerPanel.PlaySequence(g_sceneanimsList[g_sceneanimindex], true);
    playerPanel.SetCameraPreset(6, false);
}
function SceneNextAnimSequence() {
    g_sceneanimindex++;
    if (g_sceneanimindex >= g_sceneanimsList.length) {
        g_sceneanimindex = 0;
    }
    var playerPanel = $("#Player1");
    playerPanel.PlaySequence(g_sceneanimsList[g_sceneanimindex], true);
}
function ScenePrevAnimSequence() {
    g_sceneanimindex--;
    if (g_sceneanimindex < 0) {
        g_sceneanimindex = g_sceneanimsList.length - 1;
    }
    var playerPanel = $("#Player1");
    playerPanel.PlaySequence(g_sceneanimsList[g_sceneanimindex], true);
}
function GenerateInventoryImages() {
    $("#Player1").GenerateInventoryImages();
}
var g_DialogVarCount = 0;
function UpdateParentDialogVariablesFromTextEntry(panelName) {
    var varStr = $("#ParentDialogVarTextEntry").text;
    $("#DialogVarParentPanel").SetDialogVariable('testvar', varStr);
}
function UpdateChildDialogVariablesFromTextEntry(panelName) {
    var varStr = $("#ChildDialogVarTextEntry").text;
    $("#DialogVarChildPanel").SetDialogVariable('testvar', varStr);
}
function InitDialogVariables() {
    $("#ControlsLibDiagVars").SetDialogVariableInt("count", g_DialogVarCount);
    $("#ControlsLibDiagVars").SetDialogVariable("s1", "Test1");
    $("#ControlsLibDiagVars").SetDialogVariable("s2", "Test2");
    $("#ControlsLibDiagVars").SetDialogVariable("cam_key", "%jump%");
    $("#ControlsLibDiagVars").SetDialogVariable("np_key", "%attack%");
    $("#ControlsLibDiagVars").SetDialogVariable("sp_key", "%radio%");
    $("#DiagVarLabel").text = $.Localize("\tDynamic Label Count: {d:r:count}", $("#ControlsLibDiagVars"));
    $.Schedule(1.0, UpdateDialogVariables);
    $("#ParentDialogVarTextEntry").RaiseChangeEvents(true);
    $("#ChildDialogVarTextEntry").RaiseChangeEvents(true);
    $.RegisterEventHandler('TextEntryChanged', $("#ParentDialogVarTextEntry"), UpdateParentDialogVariablesFromTextEntry);
    $.RegisterEventHandler('TextEntryChanged', $("#ChildDialogVarTextEntry"), UpdateChildDialogVariablesFromTextEntry);
}
function UpdateDialogVariables() {
    g_DialogVarCount++;
    $("#ControlsLibDiagVars").SetDialogVariableInt("count", g_DialogVarCount);
    $.Schedule(1.0, UpdateDialogVariables);
}
function InitCaseTest() {
    $("#CaseTest").SetDialogVariable("casetest", "iİıI");
}
function OnImageFailLoad() {
    $("#ControlsLibPanelImageFallback").SetImage("file://{images}/icons/knife.psd");
}
function InitPanels() {
    var parent = $.FindChildInContext("#ControlsLibPanelsDynParent");
    $.CreatePanel('Label', parent, '', { text: 'Label, with text property, created dynamically from js.' });
    $.CreatePanel('Label', parent, '', { class: 'fontSize-l fontWeight-Bold', style: 'color:#558927;', text: 'Label, with text and class properties, created dynamically from js.' });
    $.CreatePanel('TextButton', parent, '', { class: 'PopupButton', text: "Output to console", onactivate: "$.Msg('Panel tab - Button pressed !!!')" });
    $.CreatePanel('ControlLibTestPanel', $.FindChildInContext('#ControlsLibPanelsJS'), '', { MyCustomProp: 'Created dynamically from javascript', CreatedFromJS: 1 });
    $.RegisterEventHandler('ImageFailedLoad', $("#ControlsLibPanelImageFallback"), OnImageFailLoad);
    $("#ControlsLibPanelImageFallback").SetImage("file://{images}/unknown2.vtf");
    $("#ImageApngtest").SetImage("file://{resources}/videos/test/apngtestnoext");
}
function TransitionBlurPanel() {
    $("#MyBlendBlurFitParent").RemoveClass("TheBlurAnimOut");
    $("#MyBlendBlurFitParent").RemoveClass("TheBlurAnimIn");
    $("#MyBlendBlurFitParent").AddClass("TheBlurAnimIn");
}
function TransitionBlurPanel2() {
    $("#MyBlendBlurFitParent").RemoveClass("TheBlurAnimIn");
    $("#MyBlendBlurFitParent").RemoveClass("TheBlurAnimOut");
    $("#MyBlendBlurFitParent").AddClass("TheBlurAnimOut");
}
function CreateSvgFromJs() {
    $.CreatePanel('Image', $('#svgButton'), '', {
        src: "file://{images}/icons/ui/smile.svg",
        texturewidth: 100,
        textureheight: 100
    });
}
function GetRssFeed() {
    BlogAPI.RequestRSSFeed();
}
function OnRssFeedReceived(feed) {
    var RSSFeedPanel = $("#RSSFeed");
    if (RSSFeedPanel == null) {
        return;
    }
    RSSFeedPanel.RemoveAndDeleteChildren();
    for (const item of feed.items) {
        var itemPanel = $.CreatePanel('Panel', RSSFeedPanel, '', { acceptsinput: true });
        itemPanel.AddClass('RSSFeed__Item');
        $.CreatePanel('Label', itemPanel, '', { text: item.title, html: true, class: 'RSSFeed__ItemTitle' });
        if (item.imageUrl.length !== 0) {
            $.CreatePanel('Image', itemPanel, '', { src: item.imageUrl, class: 'RSSFeed__ItemImage', scaling: 'stretch-to-fit-preserve-aspect' });
        }
        $.CreatePanel('Label', itemPanel, '', { text: item.description, html: true, class: 'RSSFeed__ItemDesc' });
        $.CreatePanel('Label', itemPanel, '', { text: item.date, html: true, class: 'RSSFeed__ItemDate' });
        itemPanel.SetPanelEvent("onactivate", SteamOverlayAPI.OpenURL.bind(SteamOverlayAPI, item.link));
    }
}
function JSReadyReset() {
    var elParent = $('#ControlsLibBugsReadyParent');
    var elBtnAddChild = $('#ControlsLibBugsReadyButtonAddChild');
    var elBtnAddBgImg = $('#ControlsLibBugsReadyButtonAddBgImg');
    elParent.RemoveAndDeleteChildren();
    elParent.SetReadyForDisplay(false);
    elBtnAddChild.enabled = true;
    elBtnAddBgImg.enabled = false;
}
function JSReadyAddChild() {
    var elParent = $('#ControlsLibBugsReadyParent');
    var elBtnAddChild = $('#ControlsLibBugsReadyButtonAddChild');
    var elBtnAddBgImg = $('#ControlsLibBugsReadyButtonAddBgImg');
    $.CreatePanel('Panel', elParent, 'ControlsLibBugsReadyChild', { class: 'ControlLibBugs__ReadyChild' });
    elBtnAddChild.enabled = false;
    elBtnAddBgImg.enabled = true;
}
function JSReadyAddBgImg() {
    var elBtnAddChild = $('#ControlsLibBugsReadyButtonAddChild');
    var elBtnAddBgImg = $('#ControlsLibBugsReadyButtonAddBgImg');
    var elParent = $('#ControlsLibBugsReadyParent');
    var elChild = $('#ControlsLibBugsReadyChild');
    elBtnAddChild.enabled = false;
    elBtnAddBgImg.enabled = false;
    elChild.AddClass('ControlLibBugs__ReadyChild--Ready');
    elParent.SetReadyForDisplay(true);
}
function JSTestTransition() {
    var Delay = 0.2;
    function _reveal(panelId) {
        $(panelId).AddClass('TestTransition');
    }
    $.Schedule(Delay, () => _reveal("#RepaintBugGrandchild"));
    $.Schedule(Delay * 2.0, () => _reveal("#RepaintBugChild"));
}
function JSResetTransition() {
    $('#RepaintBugChild').RemoveClass('TestTransition');
    $('#RepaintBugGrandchild').RemoveClass('TestTransition');
}
function JSControlsPageStartParticles() {
    for (const curPanel of $('#ControlsLibParticles').FindChildrenWithClassTraverse('TestParticlePanel')) {
        curPanel.StartParticles();
    }
}
function JSControlsPageStopPlayEndCapParticles() {
    for (const curPanel of $('#ControlsLibParticles').FindChildrenWithClassTraverse('TestParticlePanel')) {
        curPanel.StopParticlesWithEndcaps();
    }
}
function JSControlsPageSetControlPointParticles(cp, xpos, ypos, zpos) {
    for (const curPanel of $('#ControlsLibParticles').FindChildrenWithClassTraverse('TestParticlePanel')) {
        curPanel.SetControlPoint(cp, 0, 1 + ypos, zpos);
        curPanel.SetControlPoint(cp, xpos, ypos, zpos);
    }
}
function ShowHideWinPanel(bshow) {
    let elPanel = $.GetContextPanel().FindChildInLayoutFile('ZooWinPanel');
    elPanel.SetHasClass('winpanel-basic-round-result-visible', bshow);
    elPanel.SetHasClass('WinPanelRoot--Win', bshow);
    elPanel.SetHasClass('winpanel-mvp--show', bshow);
    elPanel.SetHasClass('MVP__MusicKit--show', bshow);
    elPanel.SetHasClass('winpanel-funfacts--show', bshow);
    elPanel.SetDialogVariable('winpanel-funfact', $.Localize('#GameUI_Stat_LastMatch_MaxPlayers'));
    elPanel.SetDialogVariable('winpanel-title', $.Localize('#winpanel_ct_win'));
    let elAvatar = elPanel.FindChildInLayoutFile('MVPAvatar');
    elAvatar.PopulateFromSteamID(MyPersonaAPI.GetXuid());
    let musicKitId = LoadoutAPI.GetItemID('noteam', 'musickit');
    let elKitName = elPanel.FindChildInLayoutFile('MVPMusicKitName');
    elKitName.text = InventoryAPI.GetItemName(musicKitId);
    let elKitLabel = elPanel.FindChildInLayoutFile('MVPMusicKitStatTrak');
    elKitLabel.text = '1000';
}
(function () {
    OpenControlsLib();
    ControlsLibNavigateToTab('ControlLibStyleGuide', 'init');
    var elTime = $("#TimeZoo");
    if (elTime) {
        elTime.SetDialogVariableTime("time", 1605560584);
    }
    jsPopupCallbackHandle = UiToolkitAPI.RegisterJSCallback(OnControlsLibPopupEvent);
    jsContextMenuCallbackHandle = UiToolkitAPI.RegisterJSCallback(OnControlsLibContextMenuEvent);
    jsPopupLoadingBarCallbackHandle = UiToolkitAPI.RegisterJSCallback(OnControlsLibPopupLoadingBarEvent);
    $.RegisterForUnhandledEvent("PanoramaComponent_Blog_RSSFeedReceived", OnRssFeedReceived);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJvbHNsaWJyYXJ5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29udHJvbHNsaWJyYXJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFDLGtDQUFrQztBQUNuQywyQ0FBMkM7QUFNM0MsSUFBSSxvQkFBb0IsR0FBbUIsSUFBSSxDQUFDO0FBRWhELFNBQVMsd0JBQXdCLENBQUcsR0FBVyxFQUFFLEdBQVc7SUFJeEQsSUFBSyxvQkFBb0IsRUFDekI7UUFDSSxvQkFBb0IsQ0FBQyxXQUFXLENBQUUsUUFBUSxDQUFFLENBQUM7S0FDaEQ7SUFFRCxvQkFBb0IsR0FBRyxDQUFDLENBQUUsR0FBRyxHQUFHLEdBQUcsQ0FBRSxDQUFDO0lBRXRDLElBQUssb0JBQW9CLEVBQ3pCO1FBQ0ksb0JBQW9CLENBQUMsUUFBUSxDQUFFLFFBQVEsQ0FBRSxDQUFDO0tBQzdDO0FBRUwsQ0FBQztBQUVELFNBQVMsZ0JBQWdCO0lBR3JCLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxXQUFXLENBQUUsRUFBRSxDQUFFLENBQUM7SUFFdEMsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDM0MsZ0JBQWdCLENBQUMsV0FBVyxDQUFFLFFBQVEsQ0FBRSxDQUFDO0FBQzdDLENBQUM7QUFFRCxTQUFTLGVBQWU7SUFFcEIsSUFBSSxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDM0MsZ0JBQWdCLENBQUMsUUFBUSxDQUFFLFFBQVEsQ0FBRSxDQUFDO0FBQzFDLENBQUM7QUFLRCxJQUFJLHFCQUFxQixHQUFrQixJQUFJLENBQUM7QUFDaEQsSUFBSSwrQkFBK0IsR0FBa0IsSUFBSSxDQUFDO0FBQzFELElBQUksb0JBQW9CLEdBQUcsQ0FBQyxDQUFDO0FBRTdCLFNBQVMsZUFBZTtJQUVsQixDQUFDLENBQUUsd0JBQXdCLENBQWUsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0FBQzdELENBQUM7QUFFRCxTQUFTLHVC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