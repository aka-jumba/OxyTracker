export default class Database {
  constructor(firebaseHandler, setDataSource) {
    this.userMapping = {};
    this.citizensMapping = {};
    this.cylinderMapping = {};

    this.citizenToCylinderMapping = {};

    this.firebaseHandler = firebaseHandler;
    this.setDataSource = setDataSource;
  }

  startRefetchLoop = async (mins) => {
    this.refetch();
    setInterval(() => {
      this.refetch();
    }, mins * 60 * 1000);
  }

  refetch = async () => {
    const users = await this.firebaseHandler.fetchUsers();
    const cylinders = await this.firebaseHandler.fetchCylinders();
    const citizens = await this.firebaseHandler.fetchCitizens();

    const usersList = this.prepareUserTableData(users);
    this.userMapping = usersList;
    const cylinderList = this.prepareCylinderData(cylinders, users, citizens);
    this.cylinderMapping = cylinderList;
    const citizensList = this.prepareCitizensData(citizens);
    this.citizensMapping = citizensList;

    this.setDataSource(cylinderList, usersList, {});
  }

  getFormattedDateTimeString = (date_ob) => {
    const date = (`0${date_ob.getDate()}`).slice(-2);
    const month = (`0${date_ob.getMonth() + 1}`).slice(-2);
    const year = date_ob.getFullYear();

    let hours = (`0${date_ob.getHours()}`).slice(-2);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours %= 12;
    hours = hours || 12;
    const minutes = (`0${date_ob.getMinutes()}`).slice(-2);
    return [`${year}-${month}-${date}`, `${hours}:${minutes} ${ampm}`];
  }

  prepareCylinderData = (cylinders, users, citizens) => {
    const cylindersList = {};
    this.citizenToCylinderMapping = {};
    cylinders.forEach((data, id) => {
      let entity = null;
      if (data.isCitizen) {
        const owner = citizens.get(data.current_owner) || {};
        entity = {
          name: owner.name, role: 'Citizen', owner,
        };
        this.citizenToCylinderMapping[data.current_owner] = id;
      } else {
        const { name, role } = users.get(data.current_owner) || {};
        entity = {
          name, role, owner: { name, role, phone: data.current_owner },
        };
      }
      const dateObj = data.timestamp.toDate();
      const [date, time] = this.getFormattedDateTimeString(dateObj);
      entity = {
        ...entity, ...data, cylinder_id: id, timestamp: data.timestamp.seconds, date, time,
      };
      cylindersList[id] = entity;
    });
    return cylindersList;
  }

  prepareUserTableData = (users) => {
    const usersList = {};

    users.forEach((data, phone) => {
      usersList[phone] = { ...data, phone, cylinderCount: data.cylinders.length };
    });
    return usersList;
  }

  prepareCitizensData = (citizens) => {
    // same
    const citizensList = {};
    citizens.forEach((data, id) => {
      const cylinderID = this.citizenToCylinderMapping[id];
      if (cylinderID) {
        const cylinderData = this.cylinderMapping[cylinderID];
        citizensList[id] = {
          ...data,
          citizen_id: id,
          cylinder_id: cylinderData.cylinder_id,
          timestamp: cylinderData.timestamp,
          date: cylinderData.date,
          time: cylinderData.time,
        };
      } else {
        citizensList[id] = {
          ...data,
          citizen_id: id,
        };
      }
    });
    return citizensList;
  }

  getHistoryFor = async (id) => {
    const data = await this.firebaseHandler.fetchHistory(id) || {};
    const owners = [];
    if (!data.owners) {
      return [];
    }
    data.owners.forEach((history) => {
      let entity = {};
      if (history.isCitizen) {
        const owner = this.citizensMapping[history.current_owner] || {};
        entity = {
          name: owner.name, role: 'Citizen', owner,
        };
      } else {
        const { name, role } = this.userMapping[history.current_owner] || {};
        entity = {
          name, role, owner: { name, role, phone: history.current_owner },
        };
      }
      const dateObj = history.timestamp.toDate();
      const [date, time] = this.getFormattedDateTimeString(dateObj);
      entity = {
        ...entity, ...history, date, time,
      };
      owners.push(entity);
    });
    return owners;
  }
}