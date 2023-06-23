/// <reference path="csgo.d.ts" />
var GameModeFlags = (function () {
    const k_gamemodeflags = {
        competitive: {
            name: 'competitive',
            flags: [
                48,
                32,
                16
            ],
            icons: [
                'file://{images}/icons/ui/timer_both.svg',
                'file://{images}/icons/ui/timer_short.svg',
                'file://{images}/icons/ui/timer_long.svg'
            ]
        },
        deathmatch: {
            name: 'deathmatch',
            flags: [
                32
            ],
            icons: [
                'file://{images}/icons/ui/free_for_all.svg'
            ]
        }
    };
    function _GetIcon(mode, flags) {
        const iconIndex = k_gamemodeflags[mode].flags.indexOf(flags);
        return k_gamemodeflags[mode].icons[iconIndex];
    }
    function _GetOptionsString(mode) {
        let s = '';
        const arr = k_gamemodeflags[mode].flags;
        for (let i = 0; i < arr.length; ++i) {
            s += '&option' + i + '=' + arr[i];
        }
        return s;
    }
    function _AreFlagsValid(mode, flags) {
        const arrPossibleFlags = k_gamemodeflags[mode].flags;
        return (arrPossibleFlags.indexOf(flags) != -1);
    }
    function _DoesModeUseFlags(mode) {
        return k_gamemodeflags.hasOwnProperty(mode);
    }
    function _GetFlags() {
        return k_gamemodeflags;
    }
    return {
        GetOptionsString: _GetOptionsString,
        GetIcon: _GetIcon,
        AreFlagsValid: _AreFlagsValid,
        DoesModeUseFlags: _DoesModeUseFlags,
        GetFlags: _GetFlags
    };
})();
(function () {
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbF9nYW1lbW9kZWZsYWdzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXRpbF9nYW1lbW9kZWZsYWdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLGtDQUFrQztBQVNsQyxJQUFJLGFBQWEsR0FBRyxDQUFFO0lBRXJCLE1BQU0sZUFBZSxHQUFvQztRQUl4RCxXQUFXLEVBQUU7WUFDWixJQUFJLEVBQUUsYUFBYTtZQUNuQixLQUFLLEVBQUU7Z0JBQ04sRUFBRTtnQkFDRixFQUFFO2dCQUNGLEVBQUU7YUFDRjtZQUNELEtBQUssRUFBRTtnQkFDTix5Q0FBeUM7Z0JBQ3pDLDBDQUEwQztnQkFDMUMseUNBQXlDO2FBQUU7U0FDNUM7UUFFRCxVQUFVLEVBQUU7WUFDWCxJQUFJLEVBQUUsWUFBWTtZQUNsQixLQUFLLEVBQUU7Z0JBQ04sRUFBRTthQUdGO1lBQ0QsS0FBSyxFQUFFO2dCQUNOLDJDQUEyQzthQUczQztTQUNEO0tBQ0QsQ0FBQTtJQUVELFNBQVMsUUFBUSxDQUFHLElBQVksRUFBRSxLQUFhO1FBRTlDLE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBRSxJQUFJLENBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFFLEtBQUssQ0FBRSxDQUFDO1FBQ2pFLE9BQU8sZUFBZSxDQUFFLElBQUksQ0FBRSxDQUFDLEtBQUssQ0FBRSxTQUFTLENBQUUsQ0FBQztJQUNuRCxDQUFDO0lBRUQsU0FBUyxpQkFBaUIsQ0FBRyxJQUFZO1FBRXhDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNYLE1BQU0sR0FBRyxHQUFHLGVBQWUsQ0FBRSxJQUFJLENBQUUsQ0FBQyxLQUFLLENBQUM7UUFDMUMsS0FBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQ3BDO1lBQ0MsQ0FBQyxJQUFJLFNBQVMsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBRSxDQUFDLENBQUUsQ0FBQztTQUNwQztRQUNELE9BQU8sQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUVELFNBQVMsY0FBYyxDQUFHLElBQVksRUFBRSxLQUFhO1FBRXBELE1BQU0sZ0JBQWdCLEdBQUcsZUFBZSxDQUFFLElBQUksQ0FBRSxDQUFDLEtBQUssQ0FBQztRQUV2RCxPQUFPLENBQUUsZ0JBQWdCLENBQUMsT0FBTyxDQUFFLEtBQUssQ0FBRSxJQUFJLENBQUMsQ0FBQyxDQUFFLENBQUM7SUFDcEQsQ0FBQztJQUVELFNBQVMsaUJBQWlCLENBQUcsSUFBWTtRQUV4QyxPQUFPLGVBQWUsQ0FBQyxjQUFjLENBQUUsSUFBSSxDQUFFLENBQUM7SUFDL0MsQ0FBQztJQUVELFNBQVMsU0FBUztRQUVqQixPQUFPLGVBQWUsQ0FBQztJQUN4QixDQUFDO0lBRUQsT0FBTztRQUNOLGdCQUFnQixFQUFJLGlCQUFpQjtRQUNyQyxPQUFPLEVBQU8sUUFBUTtRQUN0QixhQUFhLEVBQUssY0FBYztRQUNoQyxnQkFBZ0IsRUFBSSxpQkFBaUI7UUFDckMsUUFBUSxFQUFNLFNBQVM7S0FDdkIsQ0FBQztBQUdILENBQUMsQ0FBRSxFQUFFLENBQUM7QUFFTixDQUFFO0FBRUYsQ0FBQyxDQUFFLEVBQUUsQ0FBQyJ9