import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IEvent, EventService } from '../eventservice/event.service';
import { IGadget } from '../gadgets/common/gadget-common/gadget-base/gadget.model';

export interface IBoardCollection {
  lastSelectedBoard: number;
  boardList: IBoard[];
}

export interface IBoard {
  title: string;
  description: string;
  structure: string;
  id: number;
  relationship: Heiarchy;
  tabs: ITab [];
  rows: IRow[];
}

export interface IRow {
  columns: IColumn[];
}

export interface IColumn {
  gadgets: IGadget[];
}

export enum BoardType {
  LASTSELECTED,
  IDSELECTED,
  DEFAULT,
  EMPTYBOARDCOLLECTION,
}

export enum LayoutType{
  TWO_50_50,
  ONE__20_60_20,

}

export enum Heiarchy{
  PARENT,
  CHILD
}

export interface ITab {
  title: string;
  id:number;
}

@Injectable({
  providedIn: 'root',
})
export class BoardService {
  BOARDCOLLECTION: string = 'boardCollection';
  emptyBoardCollectionObject: IBoard;

  constructor(private eventService: EventService) {
    this.emptyBoardCollectionObject = {
      title: '',
      description: '',
      structure: '',
      id: BoardType.EMPTYBOARDCOLLECTION,
      relationship: Heiarchy.PARENT,
      tabs:[],
      rows: [],
    };

    this.setupEventListeners();
  }

  public getBoardCollection() {
    return new Observable<IBoardCollection>((observer) => {
      observer.next(this.getBoardCollectionFromSource());
      return () => {};
    });
  }

  public getLastSelectedBoard() {
    return this.getBoardByType(BoardType.LASTSELECTED, -1);
  }

  public getBoardById(boardId: number) {
    return this.getBoardByType(BoardType.IDSELECTED, boardId);
  }

  /**
   *  TODO Refactor saveGadgetToBoard
   * walk the board data and find array of gadgets for the board.
   * Place gadget in the left most column at the head.
   */

  columnToInsert: number = 0; //TODO - refactor to have this passed in.

  public saveNewGadgetToBoard(incomingBoard: IBoard, incomingGadget: IGadget) {
    this.getBoardCollection().subscribe((boardCollection: IBoardCollection) => {
      boardCollection.boardList.forEach((board) => {
        if (board.id == incomingBoard.id) {
          let rowNum = 0; //TODO - refactor to have this passed in.
          let updatedGadgetList: IGadget[] = [];


          //set instanceIdValue
          incomingGadget.instanceId = Date.now();

          updatedGadgetList.push(incomingGadget);

          let totalColumns = board.rows.length;

          board.rows[rowNum].columns[this.columnToInsert].gadgets.forEach((gadget) => {
            updatedGadgetList.push(gadget);
            }
          );
          board.rows[rowNum].columns[this.columnToInsert].gadgets = updatedGadgetList;
          if (this.columnToInsert < totalColumns) {
            this.columnToInsert++;
          } else {
            this.columnToInsert = 0;
          }
        }
      });

      this.saveBoardCollectionToDestination(boardCollection);
    });
  }

  public updateBoardDueToDragAndDrop(incomingBoard: IBoard){

    this.getBoardCollection().subscribe((boardCollection: IBoardCollection) => {
      boardCollection.boardList.forEach((board) => {
        if (board.id == incomingBoard.id) {
          board.rows =[];
          board.rows = [...incomingBoard.rows];
        }
      });
      this.saveBoardCollectionToDestination(boardCollection);
    });
  }

  /**
   * Event Listners
   */
  private setupEventListeners() {
    this.eventService
      .listenForBoardCreateRequestEvent()
      .subscribe((event: IEvent) => {
        this.createNewBoard(event);
      });

    this.eventService
      .listenForBoardDeleteRequestEvent()
      .subscribe((event: IEvent) => {
        this.deleteBoard(event);
      });

    this.eventService
      .listenForGadgetDeleteEvent()
      .subscribe((event: IEvent) => {
        this.deleteGadgetFromBoard(event);
      });
  }

  private saveBoardCollectionToDestination(boardCollection: IBoardCollection) {
    localStorage.removeItem(this.BOARDCOLLECTION);
    localStorage.setItem(this.BOARDCOLLECTION, JSON.stringify(boardCollection));
  }

  private getBoardCollectionFromSource(): IBoardCollection {
    let _data = localStorage.getItem(this.BOARDCOLLECTION);
    if (_data == null) {
      return { lastSelectedBoard: -1, boardList: [] };
    } else {
      return JSON.parse(_data);
    }
  }

  private updateBoardsLayout(board:IBoard, layout: LayoutType){



    //adjust the  columns to reflect the new layout.


    // either create two columns or three columns



  }

  private getAllDefaultBoards(): IBoard[] {
    return [
      {
        title: 'Board',
        description: '',
        structure: 'A',
        id: BoardType.DEFAULT,
        tabs: [{title: 'Board',id:BoardType.DEFAULT}],
        relationship: Heiarchy.PARENT,
        rows: [
          {
            columns: [
              {
                gadgets: []
              },
              {
                gadgets: []
              },
            ],
          },
        ],
      },
    ];
  }

  private getDefaultBoard(type: number): IBoard {
    let defaultBoardsArray = this.getAllDefaultBoards();
    return defaultBoardsArray[type]; //currently only one default board type which is 0 exists
  }

  private getBoardByType(type: BoardType, boardId: number) {
    return new Observable<IBoard>((observer) => {
      let data = this.getBoardCollectionFromSource();

      if (data.boardList.length == 0) {
        observer.next(this.emptyBoardCollectionObject);
        return () => {};
      } else {
        //in case we cannot find the last selected return the first in the list.
        let boardToReturn = data.boardList[0];

        data.boardList.forEach((board) => {
          switch (type) {
            case BoardType.LASTSELECTED:
              {
                if (board.id == data.lastSelectedBoard) {
                  boardToReturn = board;
                }
              }
              break;
            case BoardType.IDSELECTED:
              {
                if (board.id == boardId) {
                  boardToReturn = board;
                  this.setLastSelectedAndSaveBoard(boardId);
                }
              }
              break;
            default:
          }
        });
        observer.next(boardToReturn);
        return () => {};
      }
    });
  }

  private createNewBoard(event: IEvent): void {
    this.getBoardCollection().subscribe((boardCollection: IBoardCollection) => {
      let newBoard = this.getDefaultBoard(0); //currently only one default board type

      newBoard.id = Date.now();
      newBoard.title = event.data['title'];
      newBoard.description = event.data['description'];
      newBoard.relationship = Heiarchy.PARENT;
      //TODO newBoard.tabs = eventData['tabs'];

      //TODO find the board that is represented by tabs array and mark it as a child

      boardCollection.lastSelectedBoard = newBoard.id;

      boardCollection.boardList = [...boardCollection.boardList, newBoard];

      this.saveBoardCollectionToDestination(boardCollection);

      this.eventService.emitBoardCreatedCompleteEvent({
        data: newBoard,
      });
    });
  }

  private deleteBoard(event: IEvent) {
    this.getBoardCollection().subscribe((boardCollection: IBoardCollection) => {
      let idx = boardCollection.boardList.findIndex(
        (board) => board.id === event.data['id']
      );

      boardCollection.boardList.splice(idx, 1);

      /**
        If the last selected board is the item being deleted
        adjust the lastselected to the most recently created
        TODO maintain a list of 5 most recently last selected
      */

      if (event.data['id'] === boardCollection.lastSelectedBoard) {
        let mostRecentlyCreated = 0;

        boardCollection.boardList.forEach((board) => {
          if (mostRecentlyCreated < board.id) {
            mostRecentlyCreated = board.id;
          }
        });

        boardCollection.lastSelectedBoard = mostRecentlyCreated;
      }

      this.saveBoardCollectionToDestination(boardCollection);
    });

    this.eventService.emitBoardDeletedCompleteEvent({ data: event });
  }

  private setLastSelectedAndSaveBoard(boardId: number) {
    this.getBoardCollection().subscribe((boardCollection: IBoardCollection) => {
      boardCollection.lastSelectedBoard = boardId;
      this.saveBoardCollectionToDestination(boardCollection);
    });
  }

  private deleteGadgetFromBoard(eventDataGadgetInstanceId: IEvent) {
    this.getBoardCollection().subscribe((boardCollection: IBoardCollection) => {
      //find board
      boardCollection.boardList.forEach((board) => {
        board.rows.forEach((rowData) => {
          rowData.columns.forEach((columnData) => {
            let idx = columnData.gadgets.findIndex(
              (gadget) => gadget.instanceId === eventDataGadgetInstanceId.data
            );
            if (idx >= 0) {
              columnData.gadgets.splice(idx, 1);
              this.saveBoardCollectionToDestination(boardCollection);
            }
          });
        });
      });
    });
  }
}
