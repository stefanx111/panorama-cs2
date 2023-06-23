/// <reference path="../csgo.d.ts" />
var Scheduler = (function () {
    const oJobs = {};
    function _Schedule(delay, fn, key = 'default') {
        if (!oJobs.hasOwnProperty(key))
            oJobs[key] = [];
        oJobs[key].push(_Job(delay, fn, key));
    }
    function _Cancel(key = 'default') {
        if (oJobs.hasOwnProperty(key)) {
            while (oJobs[key].length) {
                const job = oJobs[key].pop();
                job.Cancel();
            }
        }
    }
    function _Job(delay, func, key) {
        let m_handle = $.Schedule(delay, function () {
            m_handle = null;
            func();
        });
        function _GetHandle() {
            return m_handle;
        }
        function _Cancel() {
            if (m_handle) {
                $.CancelScheduled(m_handle);
                m_handle = null;
            }
        }
        return {
            Cancel: _Cancel,
            GetHandle: _GetHandle,
        };
    }
    return {
        Schedule: _Schedule,
        Cancel: _Cancel
    };
})();
(function () {
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NoZWR1bGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2NoZWR1bGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFDQUFxQztBQWVyQyxJQUFJLFNBQVMsR0FBRyxDQUFFO0lBU2pCLE1BQU0sS0FBSyxHQUEwQixFQUFFLENBQUM7SUFFeEMsU0FBUyxTQUFTLENBQUcsS0FBYSxFQUFFLEVBQWMsRUFBRSxNQUFjLFNBQVM7UUFFMUUsSUFBSyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUUsR0FBRyxDQUFFO1lBQ2hDLEtBQUssQ0FBRSxHQUFHLENBQUUsR0FBRyxFQUFFLENBQUM7UUFFbkIsS0FBSyxDQUFFLEdBQUcsQ0FBRSxDQUFDLElBQUksQ0FBRSxJQUFJLENBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUUsQ0FBRSxDQUFDO0lBQzdDLENBQUM7SUFFRCxTQUFTLE9BQU8sQ0FBRyxNQUFjLFNBQVM7UUFFekMsSUFBSyxLQUFLLENBQUMsY0FBYyxDQUFFLEdBQUcsQ0FBRSxFQUNoQztZQUNDLE9BQVEsS0FBSyxDQUFFLEdBQUcsQ0FBRSxDQUFDLE1BQU0sRUFDM0I7Z0JBQ0MsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFFLEdBQUcsQ0FBRSxDQUFDLEdBQUcsRUFBRyxDQUFDO2dCQUNoQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDYjtTQUNEO0lBQ0YsQ0FBQztJQUVELFNBQVMsSUFBSSxDQUFHLEtBQWEsRUFBRSxJQUFnQixFQUFFLEdBQVc7UUFFM0QsSUFBSSxRQUFRLEdBQWtCLENBQUMsQ0FBQyxRQUFRLENBQUUsS0FBSyxFQUFFO1lBRWhELFFBQVEsR0FBRyxJQUFJLENBQUM7WUFDaEIsSUFBSSxFQUFFLENBQUM7UUFHUixDQUFDLENBQUUsQ0FBQztRQUlKLFNBQVMsVUFBVTtZQUVsQixPQUFPLFFBQVEsQ0FBQztRQUNqQixDQUFDO1FBRUQsU0FBUyxPQUFPO1lBRWYsSUFBSyxRQUFRLEVBQ2I7Z0JBRUMsQ0FBQyxDQUFDLGVBQWUsQ0FBRSxRQUFRLENBQUUsQ0FBQztnQkFDOUIsUUFBUSxHQUFHLElBQUksQ0FBQzthQUNoQjtRQUNGLENBQUM7UUFFRCxPQUFPO1lBQ04sTUFBTSxFQUFFLE9BQU87WUFDZixTQUFTLEVBQUUsVUFBVTtTQUNyQixDQUFDO0lBQ0gsQ0FBQztJQUVELE9BQU87UUFFTixRQUFRLEVBQUUsU0FBUztRQUNuQixNQUFNLEVBQUUsT0FBTztLQUNmLENBQUM7QUFDSCxDQUFDLENBQUUsRUFBRSxDQUFDO0FBS04sQ0FBRTtBQUVGLENBQUMsQ0FBRSxFQUFFLENBQUMifQ==