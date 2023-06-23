/// <reference path="csgo.d.ts" />
var DigitPanelFactory = (function () {
    function _MakeDigitPanel(elParent, nDigits, suffix = undefined, duration = 0.5, digitStringToken = "#digitpanel_digits", timingFunc = 'cubic-bezier( 0.9, 0.01, 0.1, 1 )') {
        elParent.RemoveAndDeleteChildren();
        const elContainer = $.CreatePanel('Panel', elParent, 'DigitPanel');
        elContainer.m_nDigits = nDigits;
        elContainer.m_suffix = suffix;
        elContainer.m_duration = duration;
        elContainer.m_strDigitsToken = digitStringToken;
        elContainer.m_timingFunc = timingFunc;
        elContainer.style.flowChildren = 'right';
        elContainer.style.overflow = 'clip';
        _MakeDigitPanelContents(elContainer);
        return elContainer;
    }
    function _UpdateSuffix(elContainer) {
        if (elContainer.m_suffix != undefined) {
            var elSuffixLabel = elContainer.FindChildTraverse('DigitPanel-Suffix');
            if (!elSuffixLabel) {
                elSuffixLabel = $.CreatePanel('Label', elContainer, 'DigitPanel-Suffix');
                elSuffixLabel.style.marginLeft = '2px';
                elSuffixLabel.style.height = "100%";
                elSuffixLabel.style.textAlign = "right";
            }
            elSuffixLabel.text = elContainer.m_suffix;
        }
        _SetWidth(elContainer);
    }
    function _MakeDigitPanelContents(elContainer) {
        if (!elContainer.IsValid())
            return;
        const elParent = elContainer.GetParent();
        if (!elParent.IsSizeValid()) {
            $.Schedule(0.5, () => _MakeDigitPanelContents(elContainer));
        }
        else {
            const ParentHeight = Math.floor(elParent.actuallayoutheight / elParent.actualuiscale_y);
            elContainer.style.height = ParentHeight + 'px';
            for (let i = 0; i < elContainer.m_nDigits; i++) {
                const elDigit = $.CreatePanel('Panel', elContainer, 'DigitPanel-Digit-' + i);
                elDigit.style.flowChildren = 'down';
                elDigit.AddClass("digitpanel__digit");
                elDigit.style.transitionProperty = 'transform, position';
                elDigit.m_duration = elContainer.m_duration + 's';
                elDigit.style.transitionDuration = elContainer.m_duration + 's';
                elDigit.style.transitionTimingFunction = elContainer.m_timingFunc;
                const arrSymbols = $.Localize(elContainer.m_strDigitsToken).split("");
                arrSymbols.forEach(function (number) {
                    const elNumeralLabel = $.CreatePanel('Label', elDigit, 'DigitPanel-Numeral-' + number);
                    elNumeralLabel.style.textAlign = 'center';
                    elNumeralLabel.style.letterSpacing = '0px';
                    elNumeralLabel.text = number;
                    elNumeralLabel.style.height = ParentHeight + "px";
                    elNumeralLabel.style.horizontalAlign = 'center';
                    elNumeralLabel.AddClass('digitpanel-font');
                });
            }
            _UpdateSuffix(elContainer);
        }
    }
    function _SetWidth(elContainer) {
        if (!elContainer.IsSizeValid())
            $.Schedule(0.1, () => _SetWidth(elContainer));
        else {
            const dig0 = elContainer.FindChildTraverse('DigitPanel-Digit-0');
            const nDigitWidth = Math.ceil(dig0.actuallayoutwidth / dig0.actualuiscale_x);
            let width = elContainer.m_nDigits * nDigitWidth;
            const elSuffixLabel = elContainer.FindChildTraverse('DigitPanel-Suffix');
            if (elSuffixLabel) {
                width += elSuffixLabel.actuallayoutwidth / elSuffixLabel.actualuiscale_x;
            }
            elContainer.style.width = width + 'px';
        }
    }
    function _SetDigitPanelString(elParent, string, bInstant = false) {
        if (!elParent)
            return;
        const elContainer = elParent.FindChildTraverse('DigitPanel');
        if (!elContainer)
            return;
        if (elContainer.GetChildCount() === 0) {
            $.Schedule(0.1, () => _SetDigitPanelString(elParent, string, bInstant));
            return;
        }
        const nDigits = elContainer.m_nDigits;
        let arrDigits = String(string).split("");
        const padsNeeded = Math.max(0, nDigits - arrDigits.length);
        if (padsNeeded > 0) {
            const padding = Array(padsNeeded).fill(" ");
            arrDigits = padding.concat(arrDigits);
            arrDigits = arrDigits.slice(0, nDigits);
        }
        const arrSymbols = $.Localize(elContainer.m_strDigitsToken).split("");
        for (let d = nDigits; d >= 0; d--) {
            const symbol = arrDigits[d];
            const elDigit = elContainer.FindChildTraverse('DigitPanel-Digit-' + d);
            if (elDigit) {
                const index = arrSymbols.indexOf(symbol);
                elDigit.visible = d < arrDigits.length;
                if (index >= 0) {
                    elDigit.style.transitionDuration = bInstant ? '0s' : elDigit.m_duration;
                    $.Schedule(0.01, () => elDigit.style.transform = "translate3D( " + d + "%," + -Number(index) * 100 + "%, 0px);");
                }
            }
        }
        _UpdateSuffix(elContainer);
    }
    return {
        MakeDigitPanel: _MakeDigitPanel,
        SetDigitPanelString: _SetDigitPanelString,
    };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlnaXRwYW5lbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRpZ2l0cGFuZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsa0NBQWtDO0FBRWxDLElBQUksaUJBQWlCLEdBQUcsQ0FBRTtJQWtCekIsU0FBUyxlQUFlLENBQUcsUUFBaUIsRUFBRSxPQUFlLEVBQUUsU0FBNkIsU0FBUyxFQUFFLFdBQW1CLEdBQUcsRUFBRSxtQkFBMkIsb0JBQW9CLEVBQUUsYUFBcUIsbUNBQW1DO1FBRXZPLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1FBQ25DLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxZQUFZLENBQWtCLENBQUM7UUFDckYsV0FBVyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUM7UUFDaEMsV0FBVyxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUM7UUFDOUIsV0FBVyxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUM7UUFDbEMsV0FBVyxDQUFDLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDO1FBQ2hELFdBQVcsQ0FBQyxZQUFZLEdBQUcsVUFBVSxDQUFDO1FBRXRDLFdBQVcsQ0FBQyxLQUFLLENBQUMsWUFBWSxHQUFHLE9BQU8sQ0FBQztRQUN6QyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUM7UUFFcEMsdUJBQXVCLENBQUUsV0FBVyxDQUFFLENBQUM7UUFFdkMsT0FBTyxXQUFXLENBQUM7SUFDcEIsQ0FBQztJQUVELFNBQVMsYUFBYSxDQUFHLFdBQXlCO1FBR2pELElBQUssV0FBVyxDQUFDLFFBQVEsSUFBSSxTQUFTLEVBQ3RDO1lBQ0MsSUFBSSxhQUFhLEdBQUcsV0FBVyxDQUFDLGlCQUFpQixDQUFFLG1CQUFtQixDQUFvQixDQUFDO1lBQzNGLElBQUssQ0FBQyxhQUFhLEVBQ25CO2dCQUNDLGFBQWEsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFFLE9BQU8sRUFB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