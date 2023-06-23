'use strict';


var EOM_Skillgroup = (function () {


	var _m_pauseBeforeEnd = 1.5;
	var _m_cP = $.GetContextPanel();

	const DEBUG_SKILLGROUP = false;

                                                     

	_m_cP.Data().m_retries = 0;

	var _DisplayMe = function()
	{
	  	                                                              
		
		                                     
		    
		   	             
		    
		if ( !_m_cP || !_m_cP.IsValid() )
			return;

		if ( !DEBUG_SKILLGROUP )
		{
			if ( !_m_cP.bSkillgroupDataReady && !MockAdapter.GetMockData() )
			{
				return false;
			}

			if( MyPersonaAPI.GetElevatedState() !== 'elevated' )
			{
				return false;
			}
		}

		var oSkillgroupData = MockAdapter.SkillgroupDataJSO( _m_cP );

		if ( DEBUG_SKILLGROUP )
		{
			function _r ( min = 0, max = 1000 )
			{
				return Math.ceil( Math.random() * ( ( max - min ) + min ) );
			};

			const oldrank = _r( 0, 18 );

			oSkillgroupData = {
				"old_rank": oldrank,
				"new_rank": oldrank+1,                               
				"num_wins": _r( 10, 1000 )
			};

		}

		var compWins = oSkillgroupData[ "num_wins" ];
		var oldRank = oSkillgroupData[ "old_rank" ];
		var newRank = oSkillgroupData[ "new_rank" ];
		var currentRank = oldRank < newRank ? newRank : oldRank;
		var mode = GameStateAPI.GetGameModeInternalName( true );

		var oData = {
			currentRank: newRank,
			compWins: compWins,

			oldRank: oldRank,
			oldRanklInfo: '',
			oldRankDesc: '',
			oldImage: '',

			newRank: newRank,
			newRanklInfo: '',
			newRankDesc: '',
			newImage: '',			
			
			mode: mode,
			model: ''
		};

		var winsNeededForRank = SessionUtil.GetNumWinsNeededForRank( oData.mode );

		if ( DEBUG_SKILLGROUP )
		{
			winsNeededForRank = 0;
			mode = 'competitive';

		}

		_m_cP.SetDialogVariable( 'eom_mode', MockAdapter.GetGameModeName( true ) );

		if ( oData.mode === 'survival' && currentRank < 1 )
		{	                                                

			oData.oldRanklInfo = $.Localize( '#eom-skillgroup-needed-dzgames', _m_cP );
			oData.oldImage = 'file://{images}/icons/skillgroups/dangerzone0.svg';
		}
		else if ( currentRank < 1 && compWins >= winsNeededForRank )
		{	
			                                              

			var modePrefix = ( oData.mode === 'scrimcomp2v2' ) ? 'wingman' : ( ( oData.mode === 'survival' ) ? 'dangerzone' : 'skillgroup' );
			
			oData.oldRanklInfo = $.Localize( '#eom-skillgroup-expired', _m_cP );
			oData.oldImage = 'file://{images}/icons/skillgroups/'+modePrefix+'_expired.svg';
		}
		else if ( currentRank < 1 )
		{
			                                   
			var matchesNeeded = winsNeededForRank - compWins;
			_m_cP.SetDialogVariableInt( 'num_matches', matchesNeeded );
			var winNeededString = ( matchesNeeded === 1 ) ? '#eom-skillgroup-needed-win' : '#eom-skillgroup-needed-wins';

			var modePrefix = ( oData.mode === 'scrimcomp2v2' ) ? 'wingman' : ( ( oData.mode === 'survival' ) ? 'dangerzone' : 'skillgroup' );

			oData.oldRanklInfo = $.Localize( winNeededString, _m_cP );
			oData.oldImage = 'file://{images}/icons/skillgroups/'+modePrefix+'0.svg';
		}
		else if ( currentRank >= 1 )
		{
			                         
			var modePrefix = ( oData.mode === 'scrimcomp2v2' ) ? 'skillgroup_wingman' : ( ( oData.mode === 'survival' ) ? 'skillgroup_dangerzone' : 'skillgroup' );
			oData.oldImage = 'file://{images}/icons/skillgroups/'+modePrefix + oldRank + '.svg';
			oData.oldRanklInfo = $.Localize( ( oData.mode === 'survival' ) ? '#skillgroup_' + oldRank + 'dangerzone' : '#RankName_' + oldRank );
			oData.oldRankDesc = $.Localize( '#eom-skillgroup-name', _m_cP );

			if ( oldRank < newRank )                             
			{
				oData.newImage = 'file://{images}/icons/skillgroups/' + modePrefix + newRank + '.svg';
				oData.newRanklInfo = $.Localize( ( oData.mode === 'survival' ) ? '#skillgroup_' + newRank + 'dangerzone' : '#RankName_' + newRank );
				oData.newRankDesc = $.Localize( '#eom-skillgroup-name', _m_cP );

				_m_pauseBeforeEnd = 3.0;
				_LoadAndShowNewRankReveal( oData );
			}
		}

		_FilloutRankData( oData );
		_m_cP.AddClass( 'eom-skillgroup-show');
	
		return true;
	};


	function _LoadAndShowNewRankReveal ( oData )
	{
		$.Schedule( 1, _RevealNewIcon.bind( undefined, oData) );
	}

	function _RevealNewIcon (oData)
	{

		if ( !_m_cP || !_m_cP.IsValid() )
			return;

		_m_cP.FindChildInLayoutFile( 'id-eom-skillgroup-emblem--new__image' ).SetImage( oData.newImage );
		_m_cP.FindChildInLayoutFile( 'id-eom-skillgroup-emblem' ).AddClass( "uprank-anim" );
		
		_m_cP.FindChildInLayoutFile( "id-eom-skillgroup__current__label" ).text = oData.newRanklInfo;

		let elParticleFlare = _m_cP.FindChildInLayoutFile( 'id-eom-skillgroup-emblem--new__pfx--above' );
		let aParticleSettings = GetSkillGroupSettings( oData.newRank );
		elParticleFlare.SetParticleNameAndRefresh( aParticleSettings[ 0 ] );
		elParticleFlare.SetControlPoint( aParticleSettings[ 1 ], aParticleSettings[ 2 ], aParticleSettings[ 3 ], 1);
		elParticleFlare.StartParticles();

		let elParticleAmb = _m_cP.FindChildInLayoutFile( 'id-eom-skillgroup-emblem--new__pfx--below' );
		let aParticleAmbSettings = GetSkillGroupAmbientSettings( oData.newRank );
		elParticleAmb.SetParticleNameAndRefresh( aParticleAmbSettings[ 0 ] );
		elParticleAmb.SetControlPoint( aParticleAmbSettings[ 1 ], aParticleAmbSettings[ 2 ], aParticleAmbSettings[ 3 ], 1 );
		elParticleAmb.StartParticles();

		$.DispatchEvent( 'CSGOPlaySoundEffect', 'UIPanorama.XP.NewSkillGroup', 'MOUSE' );
	}

	function _FilloutRankData ( oData )
	{
		var winString = ( oData.compWins === 1 ) ? '#eom-skillgroup-win' : '#eom-skillgroup-wins';
		var elDesc = _m_cP.FindChildInLayoutFile( "id-eom-skillgroup__current_wins_desc" );
		elDesc.text = $.Localize( winString, _m_cP );

		_m_cP.FindChildInLayoutFile( "id-eom-skillgroup__current_wins" ).text = oData.compWins;
		_m_cP.FindChildInLayoutFile( "id-eom-skillgroup__current__label" ).text = oData.oldRanklInfo;

		var elRankDesc = _m_cP.FindChildInLayoutFile( "id-eom-skillgroup__current__title" );
		
		if ( oData.oldRankDesc )
		{
			elRankDesc.RemoveClass( 'hidden' );
			elRankDesc.text = oData.oldRankDesc;
		}

		var elImage = _m_cP.FindChildInLayoutFile( "id-eom-skillgroup-emblem--current__image" );
		elImage.RemoveClass( 'hidden' );
		elImage.SetImage( oData.oldImage );

		let elParticleFlare = _m_cP.FindChildInLayoutFile( 'id-eom-skillgroup--current__pfx--above' );
		let aParticleSettings = GetSkillGroupSettings( oData.oldRank );
		elParticleFlare.SetParticleNameAndRefresh( aParticleSettings[ 0 ] );
		elParticleFlare.SetControlPoint( aParticleSettings[ 1 ], aParticleSettings[ 2 ], aParticleSettings[ 3 ], 0);
		elParticleFlare.StartParticles();

		let elParticleAmb = _m_cP.FindChildInLayoutFile( 'id-eom-skillgroup--current__pfx--below' );
		let aParticleAmbSettings = GetSkillGroupAmbientSettings( oData.oldRank );
		elParticleAmb.SetParticleNameAndRefresh( aParticleAmbSettings[ 0 ] );
		elParticleAmb.SetControlPoint( aParticleAmbSettings[ 1 ], aParticleAmbSettings[ 2 ], aParticleAmbSettings[ 3 ], 0 );
		elParticleAmb.StartParticles();
	}

	                                                         
	                                                                      
	    

	function _Start() 
	{

		if ( MockAdapter.GetMockData() && !MockAdapter.GetMockData().includes( 'SKILLGROUP' ) )
		{
			_End();
			return;
		}
		
		if ( _DisplayMe() )
		{
			EndOfMatch.SwitchToPanel( 'eom-skillgroup' );
			EndOfMatch.StartDisplayTimer( _m_pauseBeforeEnd );

			$.Schedule( _m_pauseBeforeEnd, _End );
		}
		else
		{
			_End();
			return;
		}
	}

	function _End() 
	{
		EndOfMatch.ShowNextPanel();
	}

	function _Shutdown()
	{
	}

	                      
	return {
		name: 'eom-skillgroup',
		Start: _Start,
		Shutdown: _Shutdown,
	};
})();


                                                                                                    
                                           
                                                                                                    
(function () {

	EndOfMatch.RegisterPanelObject( EOM_Skillgroup );

})();
