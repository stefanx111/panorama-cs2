/// <reference path="csgo.d.ts" />
const LoadingScreen = (function () {
    const cvars = ['mp_roundtime', 'mp_fraglimit', 'mp_maxrounds'];
    const cvalues = ['0', '0', '0'];
    const MAX_SLIDES = 10;
    const SLIDE_DURATION = 4;
    let m_slideShowJob = null;
    let m_mapName = null;
    let m_numImageProcessed = 0;
    let m_elCurrSlide = null;
    function _Init() {
        $('#ProgressBar').value = 0;
        $('#LoadingScreenMapName').text = "";
        $('#LoadingScreenGameMode').SetLocString("#SFUI_LOADING");
        $('#LoadingScreenModeDesc').text = "";
        const elGameModeIcon = $('#LoadingScreenGameModeIcon');
        $.RegisterEventHandler('ImageFailedLoad', elGameModeIcon, () => elGameModeIcon.visible = false);
        elGameModeIcon.visible = false;
        $('#LoadingScreenIcon').visible = false;
        const elSlideShow = $.GetContextPanel().FindChildTraverse('LoadingScreenSlideShow');
        elSlideShow.RemoveAndDeleteChildren();
        m_numImageProcessed = 0;
        if (m_slideShowJob) {
            $.CancelScheduled(m_slideShowJob);
            m_slideShowJob = null;
        }
        m_mapName = null;
    }
    function _CreateSlide(n) {
        const elSlideShow = $.GetContextPanel().FindChildTraverse('LoadingScreenSlideShow');
        const elSlide = $.CreatePanel('Image', elSlideShow, 'slide_' + n);
        elSlide.BLoadLayoutSnippet('snippet-loadingscreen-slide');
        const suffix = n == 0 ? '' : '_' + n;
        const imagePath = 'file://{images}/map_icons/screenshots/1080p/' + m_mapName + suffix + '.png';
        elSlide.SetImage(imagePath);
        elSlide.Data().imagePath = imagePath;
        elSlide.SwitchClass('viz', 'hide');
        const titleToken = '#loadingscreen_title_' + m_mapName + suffix;
        let title = $.Localize(titleToken);
        if (title == titleToken)
            title = '';
        elSlide.SetDialogVariable('screenshot-title', title);
        $.RegisterEventHandler('ImageLoaded', elSlide, () => {
            m_numImageProcessed++;
            if (m_numImageProcessed == MAX_SLIDES)
                _StartSlideShow();
        });
        $.RegisterEventHandler('ImageFailedLoad', elSlide, () => {
            elSlide.DeleteAsync(0.0);
            m_numImageProcessed++;
            if (m_numImageProcessed == MAX_SLIDES)
                _StartSlideShow();
        });
    }
    function _InitSlideShow() {
        if (m_slideShowJob)
            return;
        for (let n = 0; n < MAX_SLIDES; n++) {
            _CreateSlide(n);
        }
    }
    function _StartSlideShow() {
        const elSlideShow = $.GetContextPanel().FindChildTraverse('LoadingScreenSlideShow');
        const arrSlides = elSlideShow.Children();
        const randomOffset = Math.floor(Math.random() * arrSlides.length);
        _NextSlide(randomOffset, true);
    }
    function _NextSlide(n, bFirst = false) {
        m_slideShowJob = null;
        const elSlideShow = $.GetContextPanel().FindChildTraverse('LoadingScreenSlideShow');
        const arrSlides = elSlideShow.Children();
        if (arrSlides.length <= 1)
            return;
        if (n >= arrSlides.length)
            n = n - arrSlides.length;
        let m = n - 1;
        if (m < 0)
            m = arrSlides.length - 1;
        if (arrSlides[n]) {
            m_elCurrSlide = arrSlides[n];
            if (bFirst)
                arrSlides[n].SwitchClass('viz', 'show-first');
            else
                arrSlides[n].SwitchClass('viz', 'show');
        }
        const slide = arrSlides[m];
        if (slide)
            $.Schedule(0.25, () => {
                if (slide && slide.IsValid())
                    slide.SwitchClass('viz', 'hide');
            });
        m_slideShowJob = $.Schedule(SLIDE_DURATION, () => _NextSlide(n + 1));
    }
    function _EndSlideShow() {
        if (m_slideShowJob) {
            $.CancelScheduled(m_slideShowJob);
            m_slideShowJob = null;
        }
    }
    function _OnMapLoadFinished() { _EndSlideShow(); }
    function _UpdateLoadingScreenInfo(mapName, prettyMapName, prettyGameModeName, gameType, gameMode, descriptionText = '') {
        for (let j = 0; j < cvars.length; ++j) {
            const val = GameInterfaceAPI.GetSettingString(cvars[j]);
            if (val !== '0') {
                cvalues[j] = val;
            }
        }
        for (let j = 0; j < cvars.length; ++j) {
            const regex = new RegExp('\\${d:' + cvars[j] + '}', 'gi');
            descriptionText = descriptionText.replace(regex, cvalues[j]);
            $.GetContextPanel().SetDialogVariable(cvars[j], cvalues[j]);
        }
        if (mapName) {
            m_mapName = mapName;
            function mapIconFailedToLoad() {
                $('#LoadingScreenMapName').RemoveClass("loading-screen-content__info__text-title-short");
                $('#LoadingScreenMapName').AddClass("loading-screen-content__info__text-title-long");
                $('#LoadingScreenIcon').visible = false;
            }
            $('#LoadingScreenIcon').visible = true;
            $.RegisterEventHandler('ImageFailedLoad', $('#LoadingScreenIcon'), mapIconFailedToLoad.bind(undefined));
            $('#LoadingScreenMapName').RemoveClass("loading-screen-content__info__text-title-long");
            $('#LoadingScreenMapName').AddClass("loading-screen-content__info__text-title-short");
            $('#LoadingScreenIcon').SetImage('file://{images}/map_icons/map_icon_' + mapName + '.svg');
            $('#LoadingScreenIcon').AddClass('show');
            if (prettyMapName != "")
                $('#LoadingScreenMapName').SetAlreadyLocalizedText(prettyMapName);
            else
                $('#LoadingScreenMapName').SetLocString(GameStateAPI.GetMapDisplayNameToken(mapName));
        }
        const elInfoBlock = $('#LoadingScreenInfo');
        if (gameMode) {
            elInfoBlock.RemoveClass('hidden');
            if (prettyGameModeName != "")
                $('#LoadingScreenGameMode').SetAlreadyLocalizedText(prettyGameModeName);
            else
                $('#LoadingScreenGameMode').SetLocString('#sfui_gamemode_' + gameMode);
            $('#LoadingScreenGameModeIcon').visible = true;
            if (GameStateAPI.IsQueuedMatchmakingMode_Team() || mapName === 'lobby_mapveto')
                $('#LoadingScreenGameModeIcon').SetImage("file://{images}/icons/ui/competitive_teams.svg");
            else
                $('#LoadingScreenGameModeIcon').SetImage('file://{images}/icons/ui/' + gameMode + '.svg');
            if (descriptionText != "")
                $('#LoadingScreenModeDesc').SetAlreadyLocalizedText(descriptionText);
            else
                $('#LoadingScreenModeDesc').SetLocString("");
        }
        else
            elInfoBlock.AddClass('hidden');
        _InitSlideShow();
    }
    return {
        Init: _Init,
        UpdateLoadingScreenInfo: _UpdateLoadingScreenInfo,
        OnMapLoadFinished: _OnMapLoadFinished,
    };
})();
(function () {
    $.RegisterForUnhandledEvent('PopulateLoadingScreen', LoadingScreen.UpdateLoadingScreenInfo);
    $.RegisterForUnhandledEvent('UnloadLoadingScreenAndReinit', LoadingScreen.Init);
    $.RegisterForUnhandledEvent('JsOnMapLoadFinished', LoadingScreen.OnMapLoadFinished);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9hZGluZ3NjcmVlbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImxvYWRpbmdzY3JlZW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsa0NBQWtDO0FBRWxDLE1BQU0sYUFBYSxHQUFHLENBQUU7SUFHdkIsTUFBTSxLQUFLLEdBQUcsQ0FBRSxjQUFjLEVBQUUsY0FBYyxFQUFFLGNBQWMsQ0FBRSxDQUFDO0lBQ2pFLE1BQU0sT0FBTyxHQUFHLENBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUUsQ0FBQztJQUVsQyxNQUFNLFVBQVUsR0FBRyxFQUFFLENBQUM7SUFDdEIsTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFDO0lBQ3pCLElBQUksY0FBYyxHQUFrQixJQUFJLENBQUM7SUFDekMsSUFBSSxTQUFTLEdBQWtCLElBQUksQ0FBQztJQUNwQyxJQUFJLG1CQUFtQixHQUFHLENBQUMsQ0FBQztJQUM1QixJQUFJLGFBQWEsR0FBbUIsSUFBSSxDQUFDO0lBR3pDLFNBQVMsS0FBSztRQUVYLENBQUMsQ0FBRSxjQUFjLENBQXFCLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztRQUVqRCxDQUFDLENBQUUsdUJBQXVCLENBQWUsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ3BELENBQUMsQ0FBRSx3QkFBd0IsQ0FBZSxDQUFDLFlBQVksQ0FBRSxlQUFlLENBQUUsQ0FBQztRQUMzRSxDQUFDLENBQUUsd0JBQXdCLENBQWUsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBRXZELE1BQU0sY0FBYyxHQUFHLENBQUMsQ0FBRSw0QkFBNEIsQ0FBYSxDQUFDO1FBQ3BFLENBQUMsQ0FBQyxvQkFBb0IsQ0FBRSxpQkFBaUIsRUFBRSxjQUFjLEVBQUUsR0FBRyxFQUFFLENBQUMsY0FBYyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUUsQ0FBQztRQUNsRyxjQUFjLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztRQUUvQixDQUFDLENBQUUsb0JBQW9CLENB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