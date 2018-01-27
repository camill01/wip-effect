Ext.define('CustomApp', {
	extend: 'Rally.app.TimeboxScopedApp',
	scopeType: 'release',
	app: null,
	filterContainer: null,
	contentContainer: null,
	firstLaunch: false,
	THEME_COLOR: '#821100',
	fromDate: null,
	toDate: null,
	
	launch: function() {
		app = this;
		// Track if this is the first launch so we should auto-load from prefs
		app.firstLaunch = true;
		filterContainer = app.down( 'container' );
		contentContainer = app.add( {
			xype: 'box',
			border: 0
		});
		app.callParent( arguments );
	},
	
	// If the scope changes, such as the release filter, update ourselves
	onScopeChange: function( scope ) {
		app.callParent( arguments );
		app.initializeFilters();
	},
	
	// Set up filters, if needed
	initializeFilters:function(){
		app.hideHeader( false );
		
		// Show start and end data filters if we're not on a release-filtered page
		// The filter container will be automatically added by the app if we're not on a release-filtered page
		if ( filterContainer ) {
			var fromDateFieldId = 'fromDateFilter';
			var toDateFieldId = 'toDateFilter';
			var beginButtonId = 'beginButton';
		
			var fromDateField = filterContainer.down( '#' + fromDateFieldId );
			var toDateField = filterContainer.down( '#' + toDateFieldId );
			var beginButton = filterContainer.down( '#' + beginButtonId );
			
			if( !toDateField ) {
				filterContainer.add( {
					xtype: 'label',
					html: '--or--<br/>'
				} );
			
				fromDateField = filterContainer.add( {
					xtype: 'datefield',
					anchor: '100%',
					fieldLabel: 'From',
					itemId: fromDateFieldId,
					name: 'from_date',
					stateful: true,
					stateId: app.getContext().getScopedStateId( 'fromDate' )
				} );
			
				toDateField = filterContainer.add( {
					xtype: 'datefield',
					anchor: '100%',
					fieldLabel: 'To',
					itemId: toDateFieldId,
					name: 'to_date',
					stateful: true,
					stateId: app.getContext().getScopedStateId( 'toDate' )
				} );
				
				filterContainer.add( {
					xtype: 'rallybutton',
					itemId: beginButtonId,
					text: 'Apply Date Range',
					handler: function(){ app.beginButtonHandler( fromDateField, toDateField ); },
					style: {
						'background-color': '#61257a',
						'border-color': '#61257a'
					}
				} );
				
				// Don't make the user click the Begin button the first time if there are saved values
				if( app.firstLaunch && ( fromDateField.value || toDateField.value || app.getContext().getTimeboxScope().getRecord() ) ) {
					app.firstLaunch = false;
					app.beginButtonHandler( fromDateField, toDateField );
				}
			}
		} else {
			app.beginButtonHandler( null, null );
		}
	},
	
	// Use the from date, to date, and scope to determine the time range for the chart
	beginButtonHandler:function( fromDateField, toDateField ) {
		app.clearContent( false );
		
		var scope = app.getContext().getTimeboxScope().getRecord();
		var fromDate = null;
		if( fromDateField ) {
			if ( fromDateField.value ) {
				fromDate = fromDateField.value;
			}
		}
		if( !fromDate && scope ) {
			fromDate = scope.get('ReleaseStartDate');
		}
		
		var toDate = null;
		if( toDateField ) {
			if ( toDateField.value ) {
				toDate = toDateField.value;
			}
		}
		if( !toDate && scope ) {
			toDate = scope.get('ReleaseDate');
		}
		
		this.fromDate = fromDate;
		this.toDate = toDate;
		
		this.fetchWorkItems( fromDate );
	},
	
	fetchWorkItems:function( date ){
		// Show loading message
		app._myMask = new Ext.LoadMask(Ext.getBody(), {msg:"Calculating... Please wait."});
		app._myMask.show();
		
		console.log( this.getContext().getDataContext() );
		console.log( this.getContext().getProject() );
		console.log( date.toISOString() );
		
		Ext.create( 'Rally.data.lookback.SnapshotStore', {
			fetch: [
				'Name',
				'ScheduleState',
				'PlanEstimate',
				'FormattedID',
				'Project'
			],
			autoLoad: true,
			listeners: {
				load: this.onDateLoaded,
				scope: this
			},
			compact: true,
			context: this.getContext().getDataContext(),
			limit: Infinity,
			hydrate: ['ScheduleState','Project'],
			find: {
				ScheduleState: 'In-Progress',
				__At: date.toISOString(),
				_ProjectHierarchy: this.getContext().getProject().ObjectID
			}
		});
	},
	
	onDateLoaded: function( store, records ) {
		console.log( store );
		console.log( records );
	},
		
	countWeekDays:function( dDate1, dDate2 ) {
		var days = 0;
		var dateItr = dDate1;
		
		while( dateItr < dDate2 ) {
			dateItr.setHours( dateItr.getHours() + 6 );
			// if the new day is a weekend, don't count it
			// TODO: be locale aware and DST aware
			if( ( dateItr.getDay() != 6 ) && ( dateItr.getDay() !== 0 ) ) {
				days = days + 0.25;
			} 
		}
		return days;
	},
	
	showMessage:function( text ){
		app._myMask.hide();
		contentContainer.add({
			xtype: 'label',
			text: text
		});
	},
	
	hideHeader:function( hiddenValue ) {
		if( filterContainer ) {
			filterContainer.setVisible( !hiddenValue );
		}
	},
	
	clearContent:function( keepCharts ) {
		while( contentContainer.down( 'label' ) ) {
			contentContainer.down( 'label' ).destroy();
		}
		while( contentContainer.down( 'button' ) ) {
			contentContainer.down( 'button' ).destroy();
		}
		while( contentContainer.down( 'rallygrid' ) ) {
			contentContainer.down( 'rallygrid' ).destroy();
		}
		while( contentContainer.down( 'textareafield' ) ) {
			contentContainer.down( 'textareafield' ).destroy();
		}
		
		if( !keepCharts ) {
			while( contentContainer.down( 'rallychart' ) ) {
				contentContainer.down( 'rallychart' ).destroy();
			}
		}
	}
});