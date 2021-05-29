import React from 'react';
import { connect } from 'react-redux';

import './App.css';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import Snackbar from '@material-ui/core/Snackbar';
import { StyledFirebaseAuth } from 'react-firebaseui';
// eslint-disable-next-line import/no-extraneous-dependencies
import firebase from 'firebase/app';

import MainApp from './MainApp';
import ApiHandlerProvider from './provider/ApiHandlerProvider';
import Firebase from './Firebase';
import Database from './Database';

import { setDataSource } from './actions';

firebase.initializeApp({
  apiKey: 'AIzaSyCbGWlv_6igZpLGLQLGx5wKr1Ufd6Lv0ZI',
  authDomain: 'o2-tracker.firebaseapp.com',
  projectId: 'o2-tracker',
});

const theme = createMuiTheme({
  palette: {
    type: 'light',
    primary: {
      main: '#FF6863',
    },
    secondary: {
      main: '#ff231c',
    },
    text: {
      primary: '#455a64',
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  overrides: {
    MuiAppBar: {
      colorPrimary: {
        backgroundColor: '#F5F5F5',
      },
    },
    MuiTimelineContent: {
      root: {
        paddingBottom: 16,
      },
    },
  },
});

class App extends React.Component {
  uiconfig = {
    signInFlow: 'popup',
    signInOptions: [
      firebase.auth.GoogleAuthProvider.PROVIDER_ID,
    ],
    callbacks: {
      signInSuccess: () => false,
    },
  };

  constructor(props) {
    super(props);
    this.state = { user: null, toast: '' };
    this.firebase = new Firebase();
    this.database = new Database(this.firebase, props.setDataSource);
  }

  componentDidMount = () => {
    this.firebase.setSignInListener(
      (user) => {
        this.setState({ user });
        if (user) {
          this.database.startRefetchLoop(1);
        }
      },
      (errorMessage) => {
        // error maybe due to user not having access, network error etc
        this.setState({ toast: errorMessage });
      },
    );
  }

  render() {
    const { user } = this.state;
    let screen = (
      <div>
        <StyledFirebaseAuth
          uiConfig={this.uiconfig}
          firebaseAuth={firebase.auth()}
        />
        <div><p> Helloooo</p></div>
      </div>
    );
    if (user) {
      screen = (
        <ApiHandlerProvider
          firebaseHandler={this.firebase}
          showToast={(message) => this.setState({ toast: message })}
          databaseHandler={this.database}
        >
          <MainApp />
        </ApiHandlerProvider>
      );
    }

    return (
      <>
        {screen}
        <Snackbar
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          open={Boolean(this.state.toast)}
          autoHideDuration={5000}
          message={this.state.toast}
          onClose={() => { this.setState({ toast: '' }); }}
          key={this.state.toast}
        />
      </>
    );
  }
}

const AppWithRedux = connect(null, { setDataSource })(App);
export default () => (
  <ThemeProvider theme={theme}>
    <AppWithRedux />
  </ThemeProvider>
);
