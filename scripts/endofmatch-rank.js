'use strict';



var EOM_Rank = (function () {

	var _m_pauseBeforeEnd = 1.0;
	var _m_cP = $.GetContextPanel();

	const DEBUG_RANK = false;


                                                     

	_m_cP.Data().m_retries = 0;
	
	var _DisplayMe = function()
	{
		                                                                
	
		                                    
		   
		                                       
			               
		   

		if (!_m_cP || !_m_cP.IsValid())
			return;

		                                                         
		                                    
		if ( !DEBUG_RANK )
		{
			if ( !_m_cP.bXpDataReady && !MockAdapter.GetMockData() )
			{
				                                                       
				return false;
			}
		}

		if( MyPersonaAPI.GetElevatedState() !== 'elevated' )
		{
			return false;
		}

		var xPPerLevel = MyPersonaAPI.GetXpPerLevel();
		
		var xp_t = ( function( reason, xp )
		{
			
			var _m_reason = reason;
			var _m_xp = xp;
	
			return {
				
				m_reason: _m_reason,
				m_xp: _m_xp
			}
		} );

		var oXpData = MockAdapter.XPDataJSO( _m_cP );

		if ( DEBUG_RANK )
		{

			function _r ( min = 0, max = 100 )
			{
				return Math.ceil( Math.random() * ( ( max - min ) + min ) );
			};

			oXpData = {
				"xp_earned":
				{
					"2": 1000,                    
					"6": 1000,                    
				},
				"current_level": _r(0,39),
				"current_xp": 4899,                   
			};
		}
		if ( !oXpData )
			return false;

		var elProgress = _m_cP.FindChildInLayoutFile( "id-eom-rank__bar-container" );
		var elNew = _m_cP.FindChildInLayoutFile( "id-eom-new-reveal" );
		var elCurrent = _m_cP.FindChildInLayoutFile( "id-eom-rank__current" );
		var elBar = _m_cP.FindChildInLayoutFile( "id-eom-rank__bar" );
		var elRankLister = _m_cP.FindChildInLayoutFile( "id-eom-rank__lister" );
		var elRankListerItems = _m_cP.FindChildInLayoutFile( "id-eom-rank__lister__items" );

		var arrPreRankXP = [];                                     
		var arrPostRankXP = [];                                    
		var totalXP = 0;

		var maxLevel = InventoryAPI.GetMaxLevel();
		var elPanel = _m_cP.FindChildTraverse( 'id-eom-rank__current' );	
		elPanel.TriggerClass( 'show' );
		_m_cP.AddClass( 'eom-rank-show' );

		               
		var currentRank = oXpData[ "current_level" ];
		currentRank = currentRank < maxLevel ? currentRank : maxLevel;

		elCurrent.SetDialogVariableInt( "level", currentRank );
		elCurrent.SetDialogVariable( 'name', $.Localize( '#XP_RankName_' + currentRank, elCurrent ) );
	
		_m_cP.FindChildInLayoutFile( "id-eom-rank__current__emblem" ).SetImage( "file://{images}/icons/xp/level" + currentRank + ".png" );

		            
		var newRank = currentRank < maxLevel ?  ( currentRank + 1 ) : maxLevel;
		var elCurrentListerItem;
		var _xpSoundNum = 1;
		var xp = 0;

		var _AddXPBar = function( reason, xp )
		{
			                                                         
			var sPerXp = 0.0005;

			var duration = sPerXp * xp;

			var sPerSoundTick = 0.082;
			for ( var t = sPerSoundTick; t < duration; t += sPerSoundTick )
			{
				$.Schedule( animTime + t, function()
				{
					$.DispatchEvent( 'CSGOPlaySoundEffect', 'UIPanorama.XP.Ticker', 'eom-rank' );
				} );
			}
			$.Schedule( animTime, function()
			{
				if ( !elBar.IsValid() )
					return 0;

				var elRankSegment = $.CreatePanel( 'Panel', elBar, 'id-eom-rank__bar__segment' );
				elRankSegment.AddClass( "eom-rank__bar__segment" );

				                                    
				elBar.MoveChildAfter( elRankLister, elRankSegment );

				        
				var colorClass;
				if ( reason == "old" )
				{
					colorClass = "eom-rank__blue";
				}
				else if ( reason == "levelup" )
				{
					colorClass = "eom-rank__purple";
				}
				else if ( reason == "6" || reason == "7" )
				{
					colorClass = "eom-rank__yellow";
				}
				else if ( reason == "9" || reason == "10" || reason == "59" )
				{
					colorClass = "eom-rank__yellow";
				}
				else
				{
					colorClass = "eom-rank__green";
				}

				$.DispatchEvent( 'CSGOPlaySoundEffect', 'UIPanorama.XP.Milestone_0' + _xpSoundNum.toString(), 'eom-rank' );
				if ( _xpSoundNum < 4 )
				{
					_xpSoundNum++;
				}

				elRankSegment.AddClass( colorClass );

				elRankSegment.style.width = '0%';

				$.Schedule( 0.0, function()
				{
					if ( elRankSegment && elRankSegment.IsValid() )
					{
						elRankSegment.style.width = ( xp / xPPerLevel * 70.8 ) + '%;';                               
					}
				} );
				
				elRankSegment.style.transitionDuration = duration + "s";

				                             
				if ( elCurrentListerItem )
				{
					elCurrentListerItem.AddClass( "eom-rank__lister__item--old" );
				}

				                    
				if ( elRankListerItems && elRankListerItems.IsValid() )
				{
					elCurrentListerItem = $.CreatePanel( 'Panel', elRankListerItems, 'id-eom-rank__lister__items__' + reason );
					elCurrentListerItem.BLoadLayoutSnippet( "snippet_rank__lister__item" );

					elCurrentListerItem.RemoveClass( "eom-rank__lister__item--appear" );

					var elAmtLabel = elCurrentListerItem.FindChildTraverse( 'id-eom-rank__lister__item__amt' );
					elAmtLabel.SetDialogVariable( "xp", xp );
					elAmtLabel.text = $.Localize( "#EOM_XP_Bar", elAmtLabel );
					elAmtLabel.AddClass( colorClass );

					var elDescLabel = elCurrentListerItem.FindChildTraverse( 'id-eom-rank__lister__item__desc' );

					elDescLabel.SetDialogVariable( "gamemode", $.Localize( "#SFUI_GameMode_" + MatchStatsAPI.GetGameMode() ) );
					elDescLabel.text = $.Localize( "#XP_Bonus_RankUp_" + reason, elDescLabel );
				}
			} );

			return duration;
		}

		                     
		totalXP += parseInt( oXpData[ "current_xp" ] );

		                
		Object.keys( oXpData[ "xp_earned" ] ).forEach( function( key, index ) 
		{

			var xp = parseInt( oXpData[ "xp_earned" ][ key ] );

			                                                          
			if ( totalXP + xp < xPPerLevel )
			{
				arrPreRankXP.push( xp_t( key, xp ) );
			}
			else
			{
				var xp_upto = xPPerLevel - totalXP;
				var xp_remainder = totalXP + xp - xPPerLevel;

				                                                                   
				if ( xp_upto > 0 )
				{
					arrPreRankXP.push( xp_t( key, xp_upto ) );
					arrPostRankXP.push( xp_t( key, xp_remainder ) );
				}
				else
					arrPostRankXP.push( xp_t( key, xp ) );
			}

			totalXP += xp;
		} );


		                                     
		  
		  
		  
		  

		function _AnimSequenceNext( func, duration = 0 )
		{
			$.Schedule( animTime, func );

			animTime += duration;
		}

		var _AnimPause = function( sec )
		{
			animTime += sec;
		}

		var animTime = 0;
		_AnimPause( 1.0 );
		              
		if ( oXpData[ "current_xp" ] > 0 )
			_AnimPause( _AddXPBar( "old", oXpData[ "current_xp" ] ) );

		         
		for ( var i = 0; i < arrPreRankXP.length; i++ )
		{
			_AnimPause( 1.0 );
			if ( arrPreRankXP[ i ].m_xp > 0 )
				_AnimPause( _AddXPBar( arrPreRankXP[ i ].m_reason, arrPreRankXP[ i ].m_xp ) );
		}

		            
		if ( totalXP >= xPPerLevel )
		{
			           
			_AnimSequenceNext( function()
			{
				if ( !elProgress || !elProgress.IsValid() )
					return;

				$.DispatchEvent( 'CSGOPlaySoundEffect', 'UIPanorama.XP.BarFull', 'eom-rank' );
				elProgress.FindChildInLayoutFile( 'id-eom-rank-bar-white' ).AddClass( 'eom-rank__bar--white--show' );
			}, 1 );

			           
			                                     
			_AnimSequenceNext( function()
			{
				if ( !elProgress || !elProgress.IsValid() || 
					!elCurrent || !elCurrent.IsValid() ||
					!elBar || !elBar.IsValid() ||
					!elNew || !elNew.IsValid() ||
					!elCurrent || !elCurrent.IsValid() )
					return;

				$.DispatchEvent( 'CSGOPlaySoundEffect', 'UIPanorama.XP.NewRank', 'eom-rank' );

				                 
				elBar.FindChildrenWithClassTraverse( "eom-rank__bar__segment" ).forEach( entry => entry.DeleteAsync( .0 ) );

				                                       
				elCurrent.SetDialogVariableInt( "level", newRank );
				elCurrent.SetDialogVariable( 'name', $.Localize( '#XP_RankName_' + newRank, elCurrent ) );
				_m_cP.SetDialogVariable( 'rank_new', $.Localize( '#XP_RankName_Display', elCurrent ) );

				_m_cP.FindChildInLayoutFile( "id-eom-rank__current__label" ).text = $.Localize( "{s:rank_new}", elCurrent );
				_m_cP.FindChildInLayoutFile( "id-eom-rank__current__emblem" ).SetImage( "file://{images}/icons/xp/level" + newRank + ".png" );

				elNew.RemoveClass( "hidden" );
				elNew.FindChildInLayoutFile( 'id-eom-new-reveal-image' ).SetImage( "file://{images}/icons/xp/level" + newRank + ".png" );
				elNew.TriggerClass( "eom-rank-new-reveal--anim" );

				var elParticleEffect = elNew.FindChildInLayoutFile( 'id-eom-new-reveal-flare' );
				var aParticleSettings = GetRankParticleSettings( newRank );
				                                                                                         
				
				elParticleEffect.SetParticleNameAndRefresh( aParticleSettings[ 0 ] );
				elParticleEffect.SetControlPoint( aParticleSettings[ 1 ], aParticleSettings[ 2 ], aParticleSettings[ 3 ], aParticleSettings[ 4 ] );
				elParticleEffect.StartParticles();
			}, 3 );

			_AnimSequenceNext( function()
			{
				if ( !elProgress || !elProgress.IsValid() || 
					!elCurrent || !elCurrent.IsValid() ||
					!elBar || !elBar.IsValid() ||
					!elNew || !elNew.IsValid() ||
					!elCurrent || !elCurrent.IsValid() )
					return;

				elProgress.FindChildInLayoutFile( 'id-eom-rank-bar-white' ).RemoveClass( 'eom-rank__bar--white--show' );
			} );

			  	            
			for ( var i = 0; i < arrPostRankXP.length; i++ )
			{
				_AnimPause( _AddXPBar( arrPostRankXP[ i ].m_reason, arrPostRankXP[ i ].m_xp ) );
				
			}

			_AnimPause( 2.0 );
		}

		           
		_AnimSequenceNext( function()
		{

			                                          

		}, 1 );

		_m_pauseBeforeEnd += animTime;

		return true;
	};

                                                         
                                                                      
  
  
	function _Start() 
	{
		if ( MockAdapter.GetMockData() && !MockAdapter.GetMockData().includes( 'RANK' ) )
		{
			_End();
			return;
		}
		
		if ( _DisplayMe() )
		{
			EndOfMatch.SwitchToPanel( 'eom-rank' );
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
	    name: 'eom-rank',
		Start: _Start,
		Shutdown: _Shutdown,
	};
} )();

                                                                                                    
                                           
                                                                                                    
(function () {

	EndOfMatch.RegisterPanelObject( EOM_Rank );
})();
