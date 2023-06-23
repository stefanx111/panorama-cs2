/// <reference path="../csgo.d.ts" />
var TeamColor = (function () {
    const _GetColorString = function (color) {
        const list = color.split(' ');
        return list.join(',');
    };
    const colorRGB = [
        '100,100,100',
        _GetColorString(GameInterfaceAPI.GetSettingString("cl_teammate_color_1")),
        _GetColorString(GameInterfaceAPI.GetSettingString("cl_teammate_color_2")),
        _GetColorString(GameInterfaceAPI.GetSettingString("cl_teammate_color_3")),
        _GetColorString(GameInterfaceAPI.GetSettingString("cl_teammate_color_4")),
        _GetColorString(GameInterfaceAPI.GetSettingString("cl_teammate_color_5"))
    ];
    const _GetTeamColor = function (teamColorInx) {
        if (teamColorInx >= 0 && teamColorInx <= 4) {
            return colorRGB[teamColorInx + 1];
        }
        return colorRGB[0];
    };
    const _GetTeamColorLetter = function (teamColorInx) {
        if (teamColorInx == -1)
            return "";
        else if (teamColorInx == 0)
            return "B";
        else if (teamColorInx == 1)
            return "G";
        else if (teamColorInx == 2)
            return "Y";
        else if (teamColorInx == 3)
            return "O";
        else if (teamColorInx == 4)
            return "M";
        else if (teamColorInx == 10)
            return "<img src='target_skull.png' height='8'/>";
        return "";
    };
    return {
        GetTeamColor: _GetTeamColor,
        GetTeamColorLetter: _GetTeamColorLetter
    };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVhbWNvbG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGVhbWNvbG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFDQUFxQztBQUVyQyxJQUFJLFNBQVMsR0FBRyxDQUFDO0lBRWhCLE1BQU0sZUFBZSxHQUFHLFVBQVcsS0FBYTtRQUUvQyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzlCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN2QixDQUFDLENBQUE7SUFFRCxNQUFNLFFBQVEsR0FBRztRQUNoQixhQUFhO1FBQ2IsZUFBZSxDQUFFLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLHFCQUFxQixDQUFFLENBQUM7UUFDNUUsZUFBZSxDQUFFLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLHFCQUFxQixDQUFFLENBQUM7UUFDNUUsZUFBZSxDQUFFLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLHFCQUFxQixDQUFFLENBQUM7UUFDNUUsZUFBZSxDQUFFLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLHFCQUFxQixDQUFFLENBQUM7UUFDNUUsZUFBZSxDQUFFLGdCQUFnQixDQUFDLGdCQUFnQixDQUFFLHFCQUFxQixDQUFFLENBQUM7S0FDNUUsQ0FBQTtJQUVELE1BQU0sYUFBYSxHQUFHLFVBQVcsWUFBb0I7UUFFcEQsSUFBSyxZQUFZLElBQUksQ0FBQyxJQUFJLFlBQVksSUFBSSxDQUFDLEVBQzNDO1lBQ0MsT0FBTyxRQUFRLENBQUUsWUFBWSxHQUFHLENBQUMsQ0FBRSxDQUFDO1NBQ3BDO1FBRUQsT0FBTyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsQ0FBQyxDQUFBO0lBRUQsTUFBTSxtQkFBbUIsR0FBRyxVQUFXLFlBQW9CO1FBRTFELElBQUssWUFBWSxJQUFJLENBQUMsQ0FBQztZQUN0QixPQUFPLEVBQUUsQ0FBQzthQUNOLElBQUssWUFBWSxJQUFJLENBQUM7WUFDMUIsT0FBTyxHQUFHLENBQUM7YUFDUCxJQUFLLFlBQVksSUFBSSxDQUFDO1lBQzFCLE9BQU8sR0FBRyxDQUFDO2FBQ1AsSUFBSyxZQUFZLElBQUksQ0FBQztZQUMxQixPQUFPLEdBQUcsQ0FBQzthQUNQLElBQUssWUFBWSxJQUFJLENBQUM7WUFDMUIsT0FBTyxHQUFHLENBQUM7YUFDUCxJQUFLLFlBQVksSUFBSSxDQUFDO1lBQzFCLE9BQU8sR0FBRyxDQUFDO2FBQ1AsSUFBSyxZQUFZLElBQUksRUFBRTtZQUMzQixPQUFPLDBDQUEwQyxDQUFDO1FBRW5ELE9BQU8sRUFBRSxDQUFDO0lBbUNYLENBQUMsQ0FBQTtJQUVELE9BQU87UUFDTixZQUFZLEVBQVUsYUFBYTtRQUNuQyxrQkFBa0IsRUFBSSxtQkFBbUI7S0FDekMsQ0FBQTtBQUNGLENBQUMsQ0FBQyxFQUFFLENBQUEifQ==