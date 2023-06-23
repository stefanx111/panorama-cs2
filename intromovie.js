/// <reference path="csgo.d.ts" />
function ShowIntroMovie() {
    var movieName = "file://{resources}/videos/intro.webm";
    const launcherType = MyPersonaAPI.GetLauncherType();
    if (launcherType == "perfectworld") {
        movieName = "file://{resources}/videos/intro-perfectworld.webm";
    }
    $("#IntroMoviePlayer").SetMovie(movieName);
    $.Schedule(0.0, PlayIntroMovie);
    $("#IntroMoviePlayer").SetFocus();
    $.RegisterKeyBind($("#IntroMoviePlayer"), "key_enter,key_space,key_escape", SkipIntroMovie);
}
function PlayIntroMovie() {
    $("#IntroMoviePlayer").Play();
}
function SkipIntroMovie() {
    $("#IntroMoviePlayer").Stop();
}
function DestroyMoviePlayer() {
    $("#IntroMoviePlayer").SetMovie("");
}
function HideIntroMovie() {
    $.Schedule(0.0, DestroyMoviePlayer);
    $.DispatchEventAsync(0.0, "CSGOHideIntroMovie");
}
(function () {
    $.RegisterForUnhandledEvent("CSGOShowIntroMovie", ShowIntroMovie);
    $.RegisterForUnhandledEvent("CSGOEndIntroMovie", HideIntroMovie);
    $.RegisterEventHandler("MoviePlayerPlaybackEnded", $("#IntroMoviePlayer"), HideIntroMovie);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50cm9tb3ZpZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImludHJvbW92aWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsa0NBQWtDO0FBRWxDLFNBQVMsY0FBYztJQUVuQixJQUFJLFNBQVMsR0FBRyxzQ0FBc0MsQ0FBQztJQUN2RCxNQUFNLFlBQVksR0FBRyxZQUFZLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDcEQsSUFBSyxZQUFZLElBQUksY0FBYyxFQUNuQztRQUNJLFNBQVMsR0FBRyxtREFBbUQsQ0FBQztLQUNuRTtJQUVELENBQUMsQ0FBVyxtQkFBbUIsQ0FBRSxDQUFDLFFBQVEsQ0FBRSxTQUFTLENBQUUsQ0FBQztJQUt4RCxDQUFDLENBQUMsUUFBUSxDQUFFLEdBQUcsRUFBRSxjQUFjLENBQUUsQ0FBQztJQUNsQyxDQUFDLENBQVcsbUJBQW1CLENBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUM3QyxDQUFDLENBQUMsZUFBZSxDQUFFLENBQUMsQ0FBRSxtQkFBbUIsQ0FBRSxFQUFFLGdDQUFnQyxFQUFFLGNBQWMsQ0FBRSxDQUFDO0FBQ3BHLENBQUM7QUFFRCxTQUFTLGNBQWM7SUFFbkIsQ0FBQyxDQUFXLG1CQUFtQixDQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDN0MsQ0FBQztBQUVELFNBQVMsY0FBYztJQUVuQixDQUFDLENBQVcsbUJBQW1CLENBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUM3QyxDQUFDO0FBRUQsU0FBUyxrQkFBa0I7SUFFdkIsQ0FBQyxDQUFXLG1CQUFtQixDQUFFLENBQUMsUUFBUSxDQUFFLEVBQUUsQ0FBRSxDQUFDO0FBQ3JELENBQUM7QUFFRCxTQUFTLGNBQWM7SUFJbkIsQ0FBQyxDQUFDLFFBQVEsQ0FBRSxHQUFHLEVBQUUsa0JBQWtCLENBQUUsQ0FBQztJQUV0QyxDQUFDLENBQUMsa0JBQWtCLENBQUUsR0FBRyxFQUFFLG9CQUFvQixDQUFFLENBQUM7QUFDdEQsQ0FBQztBQUtELENBQUU7SUFFRSxDQUFDLENBQUMseUJBQXlCLENBQUUsb0JBQW9CLEVBQUUsY0FBYyxDQUFFLENBQUM7SUFDcEUsQ0FBQyxDQUFDLHlCQUF5QixDQUFFLG1CQUFtQixFQUFFLGNBQWMsQ0FBRSxDQUFDO0lBQ25FLENBQUMsQ0FBQyxvQkFBb0IsQ0FBRSwwQkFBMEIsRUFBRSxDQUFDLENBQUUsbUJBQW1CLENBQUUsRUFBRSxjQUFjLENBQUUsQ0FBQztBQUNuRyxDQUFDLENBQUUsRUFBRSxDQUFDIn0=