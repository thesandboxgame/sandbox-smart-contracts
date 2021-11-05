const deadlines: {[sector: number]: number} =  {
  0: Date.UTC(2100, 0, 1) / 1000, // Fri, 01 Jan 2100 00:00:00 GMT
  16: 1613566800, // Tuesday, 17 February 2021 13:00:00 GMT+00:00
  17: 1614776400, // Wednesday, 3 March 2021 13:00:00 GMT+00:00
  18: 1619701200, // Thursday, 29 April 2021 13:00:00 GMT+00:00
  19: Date.UTC(2021, 5, 10, 13) / 1000, // Thursday, 10 June 2021 13:00:00 GMT+00:00
  20: Date.UTC(2021, 6, 1, 13) / 1000,  // Thursday, 01 July 2021 13:00:00 GMT+00:00
  21: Date.UTC(2021, 6, 8, 13) / 1000,  // Thursday, 08 July 2021 13:00:00 GMT+00:00
  22: Date.UTC(2021, 6, 15, 13) / 1000, // Thursday, 15 July 2021 13:00:00 GMT+00:00
  23: Date.UTC(2021, 6, 22, 13) / 1000, // Thursday, 22 July 2021 13:00:00 GMT+00:00
  24: Date.UTC(2021, 6, 29, 13) / 1000, // Thursday, 29 July 2021 13:00:00 GMT+00:00
  25: Date.UTC(2021, 7, 12, 13) / 1000, // Thursday, 12 August 2021 13:00:00 GMT+00:00
  26: Date.UTC(2021, 7, 19, 13) / 1000, // Thursday, 19 August 2021 13:00:00 GMT+00:00
  27: Date.UTC(2021, 8, 2, 13) / 1000, // Thursday, 2 September 2021 13:00:00 GMT+00:00
  28: Date.UTC(2021, 8, 9, 13) / 1000, // Thursday, 9 September 2021 13:00:00 GMT+00:00
  29: Date.UTC(2021, 8, 16, 13) / 1000, // Thursday, 16 September 2021 13:00:00 GMT+00:00
  30: Date.UTC(2021, 8, 23, 13) / 1000, // Thursday, 23 September 2021 13:00:00 GMT+00:00
  31: Date.UTC(2021, 8, 30, 13) / 1000, // Thursday, 30 September 2021 13:00:00 GMT+00:00
  32: Date.UTC(2021, 10, 11, 13) / 1000, // Thursday, 11 November 2021 13:00:00 GMT+00:00
};
export default deadlines;
