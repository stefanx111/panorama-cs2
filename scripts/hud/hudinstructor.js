/// <reference path="../csgo.d.ts" />
var instructorPanel = (function () {
    const _ShowBinding = function (elLesson, hLocator, i) {
        if (elLesson.BHasClass('hidden')) {
            _HideBindings(elLesson);
            return;
        }
        let bindingTexture = 'icon_key_wide';
        let bindingText = '#GameUI_Icons_NONE';
        const binding = $.GetContextPanel().GetBinding(hLocator, i).toUpperCase();
        if (binding != '') {
            bindingText = '';
            if (binding === 'MOUSE1') {
                bindingTexture = 'icon_mouseLeft';
            }
            else if (binding === 'MOUSE2') {
                bindingTexture = 'icon_mouseRight';
            }
            else if (binding === 'MOUSE3') {
                bindingTexture = 'icon_mouseThree';
            }
            else if (binding === 'MWHEELUP') {
                bindingTexture = 'icon_mouseWheel_up';
            }
            else if (binding === 'MWHEELDOWN') {
                bindingTexture = 'icon_mouseWheel_down';
            }
            else if (binding === 'UPARROW') {
                bindingTexture = 'icon_key_up';
            }
            else if (binding === 'LEFTARROW') {
                bindingTexture = 'icon_key_left';
            }
            else if (binding === 'DOWNARROW') {
                bindingTexture = 'icon_key_down';
            }
            else if (binding === 'RIGHTARROW') {
                bindingTexture = 'icon_key_right';
            }
            else if (binding === 'SEMICOLON') {
                bindingTexture = 'icon_key_generic';
                bindingText = ';';
            }
            else if (binding.length <= 3) {
                bindingTexture = 'icon_key_generic';
                bindingText = binding;
            }
            else {
                bindingTexture = 'icon_key_wide';
                bindingText = binding;
            }
            const elBindingLabel = elLesson.FindChildTraverse('LocatorBindingText');
            const bShowBindingText = (bindingText != '');
            elLesson.SetHasClass('ShowBindingText', bShowBindingText);
            if (bShowBindingText) {
                elBindingLabel.text = $.Localize(bindingText);
            }
            elLesson.SwitchClass('BindingIcon', bindingTexture);
            if (elLesson.bindingCount && elLesson.bindingCount > 1) {
                let iNext = i + 1;
                if (iNext == elLesson.bindingCount) {
                    iNext = 0;
                }
                elLesson.animhandle = $.Schedule(.75, () => _ShowBinding(elLesson, hLocator, iNext));
            }
        }
    };
    const _HideBindings = function (elLesson) {
        if (elLesson.animhandle) {
            $.CancelScheduled(elLesson.animhandle);
            elLesson.animhandle = undefined;
        }
        elLesson.SetHasClass('ShowBindingText', false);
        elLesson.SwitchClass('BindingIcon', 'none');
    };
    const _OnShowBindingsEvent = function (elLesson, hLocator, bindingCount) {
        _HideBindings(elLesson);
        elLesson.bindingCount = bindingCount;
        _ShowBinding(elLesson, hLocator, 0);
    };
    const _OnHideBindingsEvent = function (elLesson) {
        _HideBindings(elLesson);
    };
    return {
        OnShowBindingsEvent: _OnShowBindingsEvent,
        OnHideBindingsEvent: _OnHideBindingsEvent
    };
})();
(function () {
    $.RegisterEventHandler('CSGOHudInstructorShowBindings', $.GetContextPanel(), instructorPanel.OnShowBindingsEvent);
    $.RegisterEventHandler('CSGOHudInstructorHideBindings', $.GetContextPanel(), instructorPanel.OnHideBindingsEvent);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHVkaW5zdHJ1Y3Rvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImh1ZGluc3RydWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEscUNBQXFDO0FBRXJDLElBQUksZUFBZSxHQUFHLENBQUU7SUFVdkIsTUFBTSxZQUFZLEdBQUcsVUFBVyxRQUF1QixFQUFFLFFBQWdCLEVBQUUsQ0FBUztRQUVuRixJQUFLLFFBQVEsQ0FBQyxTQUFTLENBQUUsUUFBUSxDQUFFLEVBQ25DO1lBQ0MsYUFBYSxDQUFFLFFBQVEsQ0FBRSxDQUFDO1lBQzFCLE9BQU87U0FDUDtRQUVELElBQUksY0FBYyxHQUFHLGVBQWUsQ0FBQztRQUNyQyxJQUFJLFdBQVcsR0FBRyxvQkFBb0IsQ0FBQztRQUN2QyxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsZUFBZSxFQUF1QixDQUFDLFVBQVUsQ0FBRSxRQUFRLEVBQUUsQ0FBQyxDQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDakcsSUFBSyxPQUFPLElBQUksRUFBRSxFQUNsQjtZQUNDLFdBQVcsR0FBRyxFQUFFLENBQUM7WUFFakIsSUFBSyxPQUFPLEtBQUssUUFBUSxFQUN6QjtnQkFDQyxjQUFjLEdBQUcsZ0JBQWdCLENBQUM7YUFDbEM7aUJBQ0ksSUFBSyxPQUFPLEtBQUssUUFBUSxFQUM5QjtnQkFDQyxjQUFjLEdBQUcsaUJBQWlCLENBQUM7YUFDbkM7aUJBQ0ksSUFBSyxPQUFPLEtBQUssUUFBUSxFQUM5QjtnQkFDQyxjQUFjLEdBQUcsaUJBQWlCLENBQUM7YUFDbkM7aUJBQ0ksSUFBSyxPQUFPLEtBQUssVUFBVSxFQUNoQztnQkFDQyxjQUFjLEdBQUcsb0JBQW9CLENBQUM7YUFDdEM7aUJBQ0ksSUFBSyxPQUFPLEtBQUssWUFBWSxFQUNsQztnQkFDQyxjQUFjLEdBQUcsc0JBQXNCLENBQUM7YUFDeEM7aUJBQ0ksSUFBSyxPQUFPLEtBQUssU0FBUyxFQUMvQjtnQkFDQyxjQUFjLEdBQUcsYUFBYSxDQUFDO2FB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