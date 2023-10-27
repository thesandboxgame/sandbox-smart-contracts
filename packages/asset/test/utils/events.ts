import {Event} from 'ethers';

export const findEventByName = (events: Event[], eventName: string) => {
  return events.find((event) => event.event === eventName);
};

export const findAllEventsByName = (events: Event[], eventName: string) => {
  return events.filter((event) => event.event === eventName);
};
