'use strict';


var EOM_Skillgroup = (function () {


	var _m_pauseBeforeEnd = 1.5;
	var _m_cP = $.GetContextPanel();

	function _msg ( msg )
	{
		                                  
	}

                                                     

	_m_cP.Data().m_retries = 0;

	var _DisplayMe = function()
	{
	  	                                                              
		
		                                     
		    
		   	             
		    
		if ( !_m_cP || !_m_cP.IsValid() )
			return;

		_Reset();

		function _msg ( text )
		{
			                                          
		}


		if ( !MockAdapter.bSkillgroupDataReady( _m_cP ) )
		{
			return false;
		}	

		if( MyPersonaAPI.GetElevatedState() !== 'elevated' )
		{
			return false;
		}
		

		var oSkillgroupData = MockAdapter.SkillgroupDataJSO( _m_cP );

		var oData = {
			currentRank: oSkillgroupData[ "new_rank" ],
			compWins: oSkillgroupData[ "num_wins" ],

			oldRank: oSkillgroupData[ "old_rank" ],
			oldRanklInfo: '',
			oldRankDesc: '',
			oldImage: '',

			newRank: oSkillgroupData[ "new_rank" ],
			newRanklInfo: '',
			newRankDesc: '',
			newImage: '',			
			
			mode: MockAdapter.GetPlayerCompetitiveRankType( MockAdapter.GetLocalPlayerXuid() ),
			model: ''
		};

		var currentRank = Math.max( Number(oData.newRank), Number(oData.oldRank) );
		var winsNeededForRank = SessionUtil.GetNumWinsNeededForRank( oData.mode );
		var matchesNeeded = winsNeededForRank - oData.compWins;

		_m_cP.SetDialogVariable( 'eom_mode', $.Localize( '#SFUI_GameMode' + oData.mode ) );

		if ( currentRank < 1 && matchesNeeded > 0 )
		{	
			                                              

			switch ( oData.mode )
			{
				case 'Wingman':
				case 'Competitive':

					var modePrefix = ( oData.mode === 'Wingman' ) ? 'wingman' : 'skillgroup';
					
					oData.oldRanklInfo = $.Localize( '#eom-skillgroup-expired', _m_cP );
					oData.oldImage = 'file://{images}/icons/skillgroups/' + modePrefix + '_expired.svg';
					
					break;
				
				case 'Premier':
					break;
			}
		}
		else if ( currentRank < 1 )
		{
			                                   
			_m_cP.SetDialogVariableInt( 'num_matches', matchesNeeded );
			var winNeededString = ( matchesNeeded === 1 ) ? '#eom-skillgroup-needed-win' : '#eom-skillgroup-needed-wins';

			switch ( oData.mode )
			{
				case 'Wingman':
				case 'Competitive':
			
					var modePrefix = ( oData.mode === 'Wingman' ) ? 'wingman' : 'skillgroup';

					oData.oldRanklInfo = $.Localize( winNeededString, _m_cP );
					oData.oldImage = 'file://{images}/icons/skillgroups/' + modePrefix + '0.svg';

					break;
				
				case 'Premier':
					break;
			}
		}
		else if ( currentRank >= 1 )
		{
			switch ( oData.mode )
			{
				case 'Wingman':
				case 'Competitive':

					                         
					var modePrefix = ( oData.mode === 'Wingman' ) ? 'wingman' : 'skillgroup';
					oData.oldImage = 'file://{images}/icons/skillgroups/' + modePrefix + oData.oldRank + '.svg';
					oData.oldRanklInfo = $.Localize( '#RankName_' + oData.oldRank );
					oData.oldRankDesc = $.Localize( '#eom-skillgroup-name', _m_cP );

					if ( oData.oldRank < oData.newRank )                             
					{
						oData.newImage = 'file://{images}/icons/skillgroups/' + modePrefix + oData.newRank + '.svg';
						oData.newRanklInfo = $.Localize( '#RankName_' + oData.newRank );
						oData.newRankDesc = $.Localize( '#eom-skillgroup-name', _m_cP );

						_m_pauseBeforeEnd = 3.0;
						_LoadAndShowNewRankReveal( oData );
					}
					
					break;
				
				case 'Premier':
					if ( oData.oldRank < oData.newRank )                             
					{
						_m_pauseBeforeEnd = 3.0;
						_LoadAndShowNewRankReveal( oData );
					}
					
					break;
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
	
		if ( oData.mode === 'Competitive' || oData.mode === 'Wingman' )
		{
			_m_cP.FindChildInLayoutFile( 'id-eom-skillgroup-emblem--new__image' ).SetImage( oData.newImage );
			_m_cP.FindChildInLayoutFile( 'id-eom-skillgroup-emblem' ).AddClass( "uprank-anim" );
		
			_m_cP.FindChildInLayoutFile( "id-eom-skillgroup__current__label" ).text = oData.newRanklInfo;
		
			let elParticleFlare = _m_cP.FindChildInLayoutFile( 'id-eom-skillgroup-emblem--new__pfx--above' );
			let aParticleSettings = GetSkillGroupSettings( oData.newRank, oData.mode );
			                                                                                                  
			elParticleFlare.SetParticleNameAndRefresh( aParticleSettings.particleName );
			elParticleFlare.SetControlPoint( aParticleSettings.cpNumber, aParticleSettings.cpValue[0], aParticleSettings.cpValue[ 1 ], 1);
			elParticleFlare.StartParticles();

			let elParticleAmb = _m_cP.FindChildInLayoutFile( 'id-eom-skillgroup-emblem--new__pfx--below' );
			let aParticleAmbSettings = GetSkillGroupAmbientSettings( oData.newRank, oData.mode );
			elParticleAmb.SetParticleNameAndRefresh( aParticleAmbSettings.particleName );
			elParticleAmb.SetControlPoint( aParticleAmbSettings.cpNumber, aParticleAmbSettings.cpValue[0], aParticleAmbSettings.cpValue[1], 1 );	
			elParticleAmb.StartParticles();
		}
		else if ( oData.mode === 'Premier' )
		{
			let elEmblem = _m_cP.FindChildInLayoutFile( 'jsRatingEmblem' );
			RatingEmblem.SetXuid( elEmblem, MockAdapter.GetLocalPlayerXuid(), '', oData.newRank );
		}

		$.DispatchEvent( 'CSGOPlaySoundEffect', 'UIPanorama.XP.NewSkillGroup', 'MOUSE' );
	}


	function _Reset ()
	{
		var elDesc = _m_cP.FindChildInLayoutFile( "id-eom-skillgroup__current_wins_desc" );
		elDesc.text = '';		

		_m_cP.FindChildInLayoutFile( "id-eom-skillgroup__current_wins" ).text = '';
		_m_cP.FindChildInLayoutFile( "id-eom-skillgroup__current__label" ).text = '';

		var elRankDesc = _m_cP.FindChildInLayoutFile( "id-eom-skillgroup__current__title" );
		elRankDesc.AddClass( 'hidden' );
		elRankDesc.text = '';

		var elImage = _m_cP.FindChildInLayoutFile( "id-eom-skillgroup-emblem--current__image" );
		elImage.AddClass( 'hidden' );
		elImage.SetImage( '' );

		_m_cP.FindChildInLayoutFile( 'id-eom-skillgroup-emblem--new__image' ).SetImage( '' );
		_m_cP.FindChildInLayoutFile( 'id-eom-skillgroup-emblem' ).RemoveClass( "uprank-anim" );

		_m_cP.FindChildInLayoutFile( "id-eom-skillgroup__current__label" ).text = '';

		_m_cP.RemoveClass( 'eom-skillgroup-show' );

		let elParticleFlare = _m_cP.FindChildInLayoutFile( 'id-eom-skillgroup-emblem--new__pfx--above' );
		elParticleFlare.StopParticlesImmediately( true );

		let elParticleAmb = _m_cP.FindChildInLayoutFile( 'id-eom-skillgroup-emblem--new__pfx--below' );
		elParticleAmb.StopParticlesImmediately( true );

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

		if ( oData.mode === 'Competitive' || oData.mode === 'Wingman' )
		{

			var elImage = _m_cP.FindChildInLayoutFile( "id-eom-skillgroup-emblem--current__image" );
			elImage.RemoveClass( 'hidden' );
			elImage.SetImage( oData.oldImage );

			let elParticleFlare = _m_cP.FindChildInLayoutFile( 'id-eom-skillgroup--current__pfx--above' );
			let aParticleSettings = GetSkillGroupSettings( oData.oldRank, oData.mode );
			elParticleFlare.SetParticleNameAndRefresh( aParticleSettings.particleName );
			elParticleFlare.SetControlPoint( aParticleSettings.cpNumber, aParticleSettings.cpValue[0], aParticleSettings.cpValue[1], 0 );
			elParticleFlare.StartParticles();

			let elParticleAmb = _m_cP.FindChildInLayoutFile( 'id-eom-skillgroup--current__pfx--below' );
			let aParticleAmbSettings = GetSkillGroupAmbientSettings( oData.oldRank, oData.mode );
			elParticleAmb.SetParticleNameAndRefresh( aParticleAmbSettings.particleName );
			elParticleAmb.SetControlPoint( aParticleAmbSettings.cpNumber, aParticleAmbSettings.cpValue[0], aParticleAmbSettings.cpValue[1], 0 );
			elParticleAmb.StartParticles();
		}
		else if ( oData.mode === 'Premier' )
		{
			let elEmblem = _m_cP.FindChildInLayoutFile( 'jsRatingEmblem' );
			RatingEmblem.SetXuid( elEmblem, MockAdapter.GetLocalPlayerXuid(), '', oData.oldRank );
		}
 

		
	}

	                                                         
	                                                                      
	    

	function _Start() 
	{

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
